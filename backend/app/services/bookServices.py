from app.schemas.bookSchemas import bookCreate,bookFull,userBook
from app.models.bookModels import Book,BookChunk,UserBook,Page
from app.utils.bookProcessing import clean_text

from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import httpx,json,requests,os,uuid,tempfile
from fastapi import HTTPException
from app.utils.bookProcessing import clean_text,chunk_text,max_token_batch,embed_batch



async def get_book(book:bookCreate,db:Session):

    if not book.title and not book.author:
        raise HTTPException(400,"Needs a title or an author")

    query = " ".join(filter(None, [book.title, book.author]))

    async with httpx.AsyncClient(timeout=60.0) as client:
        print("Calling Gutendex...", flush=True)
        resp = await client.get("https://gutendex.com/books/", params={"search":query})
        print("Got response", flush=True)
        resp.raise_for_status() #raises exception if there is an error
        data = resp.json()
        #print(data,flush=True)
    
    if data["count"] == 0: #book dont exist in gutenberg
        raise HTTPException(404,"Book not found")

    ans = []
    for book in data["results"]: #Get every book that shows up for what the user requested
        authors_list = [author["name"] for author in book["authors"]]
        cover_image_url = book["formats"].get("image/jpeg")
        ans.append(bookFull(gutenberg_id=book["id"],title=book["title"],authors=authors_list,formats=book["formats"],cover_image_url=cover_image_url,process_level=None))
    
    return ans

def add_book(book, db, user):
    # Try to insert the book first,allow db to deal with race conditions
    try:  
        newBook = Book(
            gutenberg_id=book.gutenberg_id,
            title=book.title,
            authors=book.authors,
            formats=book.formats,
            cover_image_url=book.cover_image_url,
            process_level="added"
        )
        db.add(newBook)
        db.commit()
        db.refresh(newBook)

    except IntegrityError:
        # Another process already inserted it
        db.rollback()#Must runn db.rollback() if there is an exception than no other querys can run in the db session meaning you wouldnt be able to check for userBook
        newBook = db.query(Book).filter(Book.gutenberg_id == book.gutenberg_id).first()

    try: #Then try to add 
        newUserBook = UserBook(book_id=newBook.id, user_id=user.id, progress=0)
        db.add(newUserBook)
        db.commit()
    except IntegrityError:
            # Race condition: another process added it first
        db.rollback()
        newUserBook = db.query(UserBook).filter(UserBook.book_id==newBook.id,UserBook.user_id==user.id).first()

    return newUserBook



async def process_book(book: userBook, db: Session):
    try:
        # 1. Ensure book exists (safe)
        db_book = db.query(Book).filter(Book.id == book.book.id).first()
        if not db_book:
            raise HTTPException(404,"not found")

        # 2. Extract metadata early (no DB dependency)
        text_url = (
            book.book.formats.get("text/plain; charset=utf-8")
            or book.book.formats.get("text/plain")
            or book.book.formats.get("text/plain; charset=us-ascii")
        )
        cover_image_url = book.book.formats.get("image/jpeg")

        # 3. 🔑 ATOMIC CLAIM (THIS IS THE MAGIC)
        updated = db.query(Book).filter(
            Book.id == book.book.id,
            Book.process_level == "added"
        ).update({
            "process_level": "processing",
            "text_url": text_url,
            "cover_image_url": cover_image_url
        })

        db.commit()

        # 4. If we didn't claim it → someone else did
        if updated == 0:
            return db.query(UserBook).filter(UserBook.user_id==book.user_id,UserBook.book_id==book.book.id).first()
        # ✅ At this point:
        # YOU are the ONLY processor

        # 5. Do expensive work OUTSIDE transaction
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.get(text_url)
            response.raise_for_status()

        cleaned_text = await clean_text(response.text)
        #chunks = await chunk_text(cleaned_text)

        # 6. Save results
        db_book = db.get(Book, book.book.id)
        db_book.text = cleaned_text
        #db_book.chunks = chunks
        db_book.process_level = "processed"

        db.commit()
        db.refresh(db_book)
        
        return db.query(UserBook).filter(UserBook.book_id==book.book.id,UserBook.user_id==book.user_id).first()


    except Exception as e:
        db.rollback()

        # Optional: reset state for retryability
        db_book = db.get(Book, book.book.id)
        if db_book and db_book.process_level == "processing":
            db_book.process_level = "added"
            db.commit()

        raise e

async def embed_pages(req,user,db):
    all_embeddings = []
    pages_with_text = [page for page in req.pages if page.text.strip() != ""]
    texts = [page.text for page in pages_with_text]
    for batch in max_token_batch(texts,100_00):
        embedded = embed_batch(batch)
        all_embeddings.extend(embedded)
    user_book = db.query(UserBook).filter(UserBook.user_id==user.id,UserBook.book_id==req.book_id).first()
    embeddings_by_index = {
        page.index: embedding
        for page, embedding in zip(pages_with_text, all_embeddings)
    }

    for page in req.pages:
        newPage = Page(
            index=page.index,
            text=page.text,
            embedding=embeddings_by_index.get(page.index),
            userBook_id = user_book.id,
            isCover=page.isCover,
            coverImage=page.coverImage
        )
        db.add(newPage)

    db.commit()

    return user_book


# async def start_reading(book,audio,db):
#     file_extension = os.path.splitext(audio.filename)[1] #gets audio type, mp3, wav etc

#     with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp: #creates a temporary file on disk that you can write too.
#         tmp.write(await audio.read())#read from the audio file which is of type UploadFile, we await because UploadFile is an async type
#         tmp_path = tmp.name

#     with open(tmp_path,"rb") as f:
#         transcript = await openai.audio.transcriptions.create( 
#             model="whisper-1",
#             file=f
#         )

#     embedding_response = await openai.embeddings.create(
#         model="text-embedding-3-small",
#         input=transcript.text,
#     )

#     embedding = embedding_response.data[0].embedding

#     start_chunk = db.query(BookChunk).filter(BookChunk.book_id == book.id).order_by(BookChunk.embedding.cosine_distance(embedding)).limit(1).all()
    
#     return start_chunk


def update_position(update,db,user):
    user_book = db.query(UserBook).filter(UserBook.book_id==update.id,UserBook.user_id==user.id).first()

    if user_book:
        user_book.progress = update.progress
        db.commit()
        db.refresh(user_book)
        return user_book.progress
    else:
        # handle missing case
        raise HTTPException(status_code=404, detail="UserBook not found")
    
