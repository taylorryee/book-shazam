from app.schemas.bookSchemas import bookCreate,bookFull
from app.models.bookModels import Book,BookChunk,UserBook
from app.utils.bookProcessing import clean_text

from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import httpx,json,requests,os,uuid,tempfile
from fastapi import HTTPException
from app.utils.bookProcessing import clean_text,chunk_text



async def get_book(book:bookCreate,db:Session):

    if not book.title and not book.author:
        raise HTTPException(400,"Needs a title or an author")
    
    if book.title:
        already_processed_titles = db.query(Book).filter(func.lower(Book.title)==book.title.lower()).all()
        if already_processed_titles:
            return already_processed_titles

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


async def process_book(book:bookFull,db:Session,user):
    try:
        db_book = db.query(Book).filter(Book.gutenberg_id==book.gutenberg_id,Book.process_level=="embedded").first()
        if db_book:
            user_book = db.query(UserBook).filter(UserBook.user_id==user.id,UserBook.book_id==book.id).first()
            if not user_book:
                user_book = UserBook(book_id = db_book.id,user_id=user.id,progress=0,lines=None)
                db.add(user_book)
                db.commit()
            return db_book
        try:
            processing_book = Book(title = book.title,authors = book.authors,formats = book.formats, gutenberg_id = book.gutenberg_id, process_level = "processing")
            db.add(processing_book)
            db.commit()
            db.refresh(processing_book)
            user_book = UserBook(book_id = processing_book.id,user_id=user.id,progress=0,lines=None)
            db.add(user_book)
            db.commit()
        except IntegrityError:
            db.rollback()
            return db.query(Book).filter(Book.gutenberg_id == book.gutenberg_id).first()

        text_url = (book.formats.get("text/plain; charset=utf-8") or 
                book.formats.get("text/plain") or 
                book.formats.get("text/plain; charset=us-ascii"))
    
        cover_image_url = book.formats.get("image/jpeg")
        processing_book.text_url = text_url
        processing_book.cover_image_url = cover_image_url
        db.commit()
    
        async with httpx.AsyncClient(timeout=60.0,follow_redirects=True) as client:
            response = await client.get(text_url)
            response.raise_for_status()

        cleaned_text = await clean_text(response.text)
        chunks = await chunk_text(cleaned_text)
        processing_book.text = cleaned_text
        processing_book.chunks = chunks
        processing_book.process_level = "chunked"


        db.commit()
        db.refresh(processing_book)
        return processing_book
    except Exception as e:
        db.rollback()
        raise e

    

async def start_reading(book,audio,db):
    file_extension = os.path.splitext(audio.filename)[1] #gets audio type, mp3, wav etc

    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp: #creates a temporary file on disk that you can write too.
        tmp.write(await audio.read())#read from the audio file which is of type UploadFile, we await because UploadFile is an async type
        tmp_path = tmp.name

    with open(tmp_path,"rb") as f:
        transcript = await openai.audio.transcriptions.create( 
            model="whisper-1",
            file=f
        )

    embedding_response = await openai.embeddings.create(
        model="text-embedding-3-small",
        input=transcript.text,
    )

    embedding = embedding_response.data[0].embedding

    start_chunk = db.query(BookChunk).filter(BookChunk.book_id == book.id).order_by(BookChunk.embedding.cosine_distance(embedding)).limit(1).all()
    
    return start_chunk

    
