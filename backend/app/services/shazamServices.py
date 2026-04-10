from fastapi import UploadFile,Depends
from app.schemas.audioSchemas import audioReturn
from app.schemas.bookSchemas import bookFull
from app.models.bookModels import Book,BookChunk
import tempfile
import asyncio
from app.config import openai
import os
from app.utils.rag import process_audio
from sqlalchemy import func
from app.db import get_db, SessionLocal
from sqlalchemy.orm import Session
from app.utils.rag import relevant_chunks
from fastapi.responses import StreamingResponse


    

def start_text(book:bookFull,text:str,db:Session):
    try:
        rank = func.ts_rank(
            BookChunk.text_search,
            func.plainto_tsquery("english", text)
        )

        results = (
            db.query(BookChunk, rank.label("rank"))
            .filter(BookChunk.book_id == book.id)
            .filter(BookChunk.text_search.match(text))
            .order_by(rank.desc())
            .limit(5)
            .all()
        )
        if not results:
            return None
        return results[0][0].chunk_index
    
    except Exception as e:
        raise e
    
    

async def upload_audio(audio:UploadFile,book:bookFull):
    file_extension = os.path.splitext(audio.filename)[1] #gets audio type, mp3, wav etc

    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp: #creates a temporary file on disk that you can write too.
        tmp.write(await audio.read())#read from the audio file which is of type UploadFile, we await because UploadFile is an async type
        tmp_path = tmp.name
    
    answer = await process_audio(tmp_path,book)


    return audioReturn(text=answer)



def stream_book(book:bookFull,start_position:int,db:Session):
    try:
        chunks = db.query(BookChunk).filter(BookChunk.book_id == book.id,BookChunk.chunk_index >= start_position).order_by(BookChunk.chunk_index).limit(10).all()
        return chunks
    except Exception as e:
        raise e
    

def upload_query(query, db, current_user):

    embedding_response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=query.text,
    )

    embedding = embedding_response.data[0].embedding

    context = relevant_chunks(embedding, query.book_id, db)
    formatted_context = "\n\n".join(
        f"Passage {i+1}:\n{chunk}" for i, chunk in enumerate(context)
    )

    book = db.get(Book, query.book_id)

    instructions = f"""You are an intelligent literary assistant helping users understand this book: {book.title}.

You will be given:
1) A user question
2) Excerpts from {book.title} that may or may not be relevant

Your job:

- First determine whether the retrieved passages are relevant to the user's question.
- If they are relevant, use them to answer accurately.
- If they are not relevant, ignore them and answer using your general knowledge of the book.
- If the question is interpretive (e.g., meaning, symbolism, themes), provide thoughtful analysis.
- If the question is factual (e.g., plot details, character names), answer clearly and concisely.
- Do NOT mention the retrieved excerpts or say things like “based on the context.”
- Do NOT explain your internal reasoning process.
"""

    user_input = f"""
Question: {query.text}

Book Excerpts:
{formatted_context}
"""

    # STREAMING RESPONSE
    with openai.responses.stream(
        model="gpt-5-nano",
        instructions=instructions,
        input=user_input,
    ) as stream:

        for event in stream:
            if event.type == "response.output_text.delta":
                yield event.delta

        stream.get_final_response()

        # return {"response":response.output_text,
        #         "context":formatted_context}
    
