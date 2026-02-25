import re, os, unicodedata
from app.celery_app import celery
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.bookModels import Book,BookChunk
from sqlalchemy import text,or_,and_
from datetime import datetime,timedelta
import tiktoken
from app.config import openai



LEASE_TIMEOUT = timedelta(minutes=10)

@celery.task
def clean_text(): #Pull based - checks db for process_level = "uploaded"
    db = SessionLocal()
    set_cleaning = False
    book = None
    now = datetime.utcnow()
    timeout_threshold = now - LEASE_TIMEOUT
    try:
        book = db.query(Book).filter(or_(Book.process_level=='uploaded',and_(Book.process_level=="cleaning",or_(Book.claimed_at<timeout_threshold,Book.claimed_at == None)))).with_for_update(skip_locked=True).first() #with_for_update locks db row/rows unitll you commit or rollback
        #and skip_locked tells other workers to skip locked rows and keep searching instead of blocking untill locked row is unlocked
        if not book:
            return 

        book.process_level = "cleaning"
        book.claimed_at = now
        db.commit()
        set_cleaning = True
        
        text = unicodedata.normalize("NFKC", book.text)

        # Normalize line endings
        text = text.replace("\r\n", "\n")

        # Remove Gutenberg header
        start_pattern = r"\*\*\*\s*START OF.*?\*\*\*"
        start_match = re.search(start_pattern, text, re.IGNORECASE)
        if start_match:
            text = text[start_match.end():]

        # Remove Gutenberg footer
        end_pattern = r"\*\*\*\s*END OF.*?\*\*\*"
        end_match = re.search(end_pattern, text, re.IGNORECASE)
        if end_match:
            text = text[:end_match.start()]

        # Normalize smart punctuation
        replacements = {
            "“": '"',
            "”": '"',
            "‘": "'",
            "’": "'",
            "—": "-",
            "–": "-",
        }
        for k, v in replacements.items():
            text = text.replace(k, v)

        # Remove bracket-only lines
        text = re.sub(r"^\[.*?\]$", "", text, flags=re.MULTILINE)

        # Remove excessive blank lines and strip trailing whitespace
        cleaned = "\n".join(line.rstrip() for line in re.sub(r"\n{3,}", "\n\n", text).split("\n")).strip()
        
        book.text = cleaned
        book.claimed_at = None
        book.process_level = "cleaned" 
        db.commit()
 
    
    except Exception as e:
        db.rollback()
        if book and set_cleaning: #We only need to set to failed if the process_level was set to "cleaning". If it was never set to "cleaning" than it is still in the "uploaded" phase and another worker can pick it up and retry. 
            #Also we can set process_level to "failed" safelly because its already in the "cleaning" state which means no other worker will pick it up so we dont have to worry about race conditions. 
            try:
                book.process_level = "failed_cleaning"
                book.claimed_at = None
                db.commit()
            except:
                db.rollback()
        
            raise e
    finally:
        db.close()



encoding = tiktoken.get_encoding("cl100k_base")  #Token counter
def count_tokens(text: str) -> int:
    return len(encoding.encode(text))


def chunk_paragraphs(paragraphs: list[str], max_tokens: int):
    chunks = []
    current_chunk = []
    current_tokens = 0
    chunk_index = 0

    for p in paragraphs:
        p_tokens = count_tokens(p)

        # If paragraph itself is too large, split by sentences
        if p_tokens > max_tokens:
            sentences = p.split(". ")
            for s in sentences:
                s_tokens = count_tokens(s)

                if current_tokens + s_tokens > max_tokens:
                    if current_chunk:
                        chunk_text = "\n\n".join(current_chunk)
                        chunks.append({
                            "chunk_index": chunk_index,
                            "text": chunk_text,
                            "token_count": current_tokens,
                        })
                        chunk_index += 1

                    current_chunk = [s]
                    current_tokens = s_tokens
                else:
                    current_chunk.append(s)
                    current_tokens += s_tokens
            continue

        # Normal paragraph packing
        if current_tokens + p_tokens > max_tokens:
            if current_chunk:
                chunk_text = "\n\n".join(current_chunk)
                chunks.append({
                    "chunk_index": chunk_index,
                    "text": chunk_text,
                    "token_count": current_tokens,
                })
                chunk_index += 1

            current_chunk = [p]
            current_tokens = p_tokens
        else:
            current_chunk.append(p)
            current_tokens += p_tokens

    # Flush final chunk
    if current_chunk:
        chunk_text = "\n\n".join(current_chunk)
        chunks.append({
            "chunk_index": chunk_index,
            "text": chunk_text,
            "token_count": current_tokens,
            "embedding":None
        })

    return chunks

@celery.task
def chunk_text():
    db = SessionLocal()
    set_chunking = False
    now = datetime.utcnow()
    timeout_threshold = now - LEASE_TIMEOUT
    book = None
    try:
        book = db.query(Book).filter(or_(Book.process_level=='cleaned',and_(Book.process_level=="chunking",or_(Book.claimed_at<timeout_threshold,Book.claimed_at == None)))).with_for_update(skip_locked=True).first()
        if not book:
            return 
        
        book.process_level = "chunking"
        book.claimed_at = now
        db.commit()
        set_chunking = True

        ######################CHUNKING LOGIC#################################
        paragraphs = [p.strip() for p in book.text.split("\n\n") if p.strip()]
        chunks = chunk_paragraphs(paragraphs,500)
        book.chunks = chunks
        book.claimed_at = None
        book.process_level = "chunked"
        db.commit()

    except Exception as e:
        db.rollback()
        if book and set_chunking:
            try:
                book.process_level = "failed_chunking"
                book.claimed_at = None
                db.commit()
            except:
                db.rollback()
        raise e
    
    finally:
        db.close()



def embed_batch(texts: list[str]) -> list[list[float]]:
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]
    
def max_token_batch(texts,max_batch_size):
    batch = []
    batch_size = 0

    for chunk in texts:
        cur = count_tokens(chunk["text"])
        if cur + batch_size > max_batch_size:
            if batch:
                yield batch
            batch = [chunk["text"]]
            batch_size = cur
        else:
            batch.append(chunk["text"])
            batch_size += cur
    if batch:
        yield batch


@celery.task
def embed_chunks():
    db = SessionLocal()
    now = datetime.utcnow()
    timeout_threshold = now - LEASE_TIMEOUT
    set_embedding = False
    try:
        book = db.query(Book).filter(Book.process_level=='chunked').with_for_update(skip_locked=True).first()
        if not book:
            return

        book.process_level = "embedding"
        book.claimed_at = now
        db.commit()
        set_embedding = True
            
        all_embeddings = []
        for batch in max_token_batch(book.chunks,100_000):
            embedded = embed_batch(batch)
            all_embeddings.extend(embedded)
            
        for chunk,embedding in zip(book.chunks,all_embeddings):
            newBookChunk = BookChunk(book_id = book.id, chunk_index = chunk["chunk_index"],text = chunk["text"],embedding = embedding)
            chunk["embedding"] = embedding
            db.add(newBookChunk)
            

        book.process_level = "embedded"
        book.claimed_at = None
        db.commit()


    except Exception as e:
        db.rollback()
        if set_embedding:
            try:
                book.process_level = "embedding_failed"
                book.claimed_at = None
                db.commit()
            except:
                db.rollback()

        raise e

        
    finally:
        db.close()