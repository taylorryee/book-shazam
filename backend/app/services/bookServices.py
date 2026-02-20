from app.schemas.bookSchemas import bookCreate,bookFull
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
        authors_list = [author["name"] for author in book["authors"]]
        ans.append(bookFull(gutenberg_id=book["id"],title=book["title"],authors=authors_list,formats=book["formats"],process_level=None))
    
    return ans


async def process_book(book:bookFull,db:Session):
    already_processed = db.query(Book).filter(Book.gutenberg_id == book.gutenberg_id).first()
    if already_processed:
        return already_processed

    
    text_url = (book.formats.get("text/plain; charset=utf-8") or 
                book.formats.get("text/plain") or 
                book.formats.get("text/plain; charset=us-ascii"))
    
    cover_image_url = book.formats.get("image/jpeg")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(text_url)
        response.raise_for_status()

    #print("About to enqueue celery task...",flush=True)
    #process_task = clean_text.delay(response.text,book.gutenberg_id) 
    #print("enqued celery task..",process_task.id,flush=True)

    processing_book = Book(gutenberg_id=book.gutenberg_id, title=book.title, authors=book.authors, formats=book.formats, text_url=text_url, cover_image_url=cover_image_url,process_level="processing",text = response.text)
    
    db.add(processing_book)
    
    try:
        db.commit()
        db.refresh(processing_book)
        process_task = clean_text.delay(processing_book.id)
        return processing_book
    except IntegrityError:
        db.rollback()
        raise HTTPException(400,"error adding to db")
    
