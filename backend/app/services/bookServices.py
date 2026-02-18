from app.schemas.bookSchemas import bookCreate,fullBook
from app.models.bookModels import Book
from app.utils.bookProcessing import clean_text

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import httpx,json,requests,os,uuid
from fastapi import HTTPException


async def get_book(book:bookCreate,db:Session):
    if not book.title and not book.author:
        raise HTTPException(400,"Needs a title or an author")
    
    if book.title:
        already_processed_title = db.query(Book).filter(func.lower(Book.title)==book.title.lower()).all()
        if already_processed_title:
            return already_processed_title

    query = " ".join(filter(None, [book.title, book.author]))

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get("https://gutendex.com/books/", params={"search":query})
        resp.raise_for_status() #raises exception if there is an error
        data = resp.json()
        #print(data,flush=True)
    
    if data["count"] == 0: #book dont exist in gutenberg
        raise HTTPException(404,"Book not found")

    ans = []
    for book in data["results"]: #Get every book that shows up for what the user requested
        ans.append(fullBook(gutenberg_id=book["id"],title=book["title"],authors=book["authors"],formats=book["formats"]))
    
    return ans


async def process_book(book:fullBook,db:Session):
    already_processed = db.query(Book).filter(Book.gutenberg_id == book.gutenberg_id).first()
    if already_processed:
        raise HTTPException(400,"book already in db")

    ##   return already_processed
    
    text_url = (book.formats.get("text/plain; charset=utf-8") or 
                book.formats.get("text/plain") or 
                book.formats.get("text/plain; charset=us-ascii"))
    
    cover_image_url = book.formats.get("image/jpeg")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(text_url)
        #response.raise_for_status()
    #file_path = os.path.abspath(f"output_{book.gutenberg_id}.txt")
    print("About to enqueue celery task...",flush=True)
    process_task = clean_text.delay(response.text) 
    print("enqued celery task..",process_task.id,flush=True)
    authors_list = [person.name for person in book.authors]
    processing_book = Book(gutenberg_id=book.gutenberg_id, title=book.title, authors=authors_list, formats=book.formats, text_url=text_url, cover_image_url=cover_image_url,process_level="processing")
    
    db.add(processing_book)
    
    try:
        db.commit()
        return {"process_task:id":process_task.id}
    except IntegrityError:
        db.rollback()
        raise HTTPException(400,"book already in db")
    
