from app.schemas.bookSchemas import bookCreate
from app.models.bookModels import Book

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import httpx
import json

async def get_book(book:bookCreate,db:Session):
    already_processed = db.query(Book).filter(Book.title == book.title,Book.author == book.author).first()
    
    if already_processed:
        return already_processed
    
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://gutendex.com/books/", params={"search": book.title})
        data = resp.json()
    
    if data["count"] == 0: #book dont exist in gutenberg
        return None
    
    book = data["results"][0]
    text_url = book["formats"].get("text/plain; charset=us-ascii")
    html_url = book["formats"].get("text/html")
    cover_image_url = book["formats"].get("image/jpeg")
   
    if text_url:
        await process_level = process_book(text_url,True,False) #THIS SHOULD BE CELERY TASK, process_level(url,text_url?,html_url?)
        #process_book.delay(text_url,True,False) #Celery task for once we i setup celery
        #process_level = "processing"
    
    elif html_url:
        await process_level = process_book(html_url,False,True)
        #process_book.delay(html_url,False,True)
        #process_level="processing"
    else:
        process_level = "noContext"
    
    new_book = Book(gutenberg_id = book["id"],title=book.title, author=book.author, text_url=text_url, html_url=html_url, cover_image_url=cover_image_url,process_level=process_level)
    db.add(new_book)
    try:
        db.commit()
        db.refresh(new_book)
        return new_book
    
    except IntegrityError:
        db.rollback()
        return None

    