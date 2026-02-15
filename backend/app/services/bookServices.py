from app.schemas.bookSchemas import bookCreate
from app.models.bookModels import Book

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import httpx
import json

def process_book(url,t,f):
    return "processing"

#create_book_frame helper functions


async def get_book(book:bookCreate,db:Session):
    if not book.title and not book.author:
        return "Need book or title"
    
    if book.title:
        already_processed_title = db.query(Book).filter(func.lower(Book.title)==book.title.lower()).first()
        if already_processed_title:
            return already_processed_title
    
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://gutendex.com/books/", params={"search": book.title})
        data = resp.json()
        #print(data,flush=True)
    
    if data["count"] == 0: #book dont exist in gutenberg
        return None
    

    return data["results"]



async def process_book(book:bookCreate,db:Session):

    already_processed = db.query(Book).filter(Book.title == book.title,Book.author == guten_book["authors"][0]["name"]).first()
    
    if already_processed:
        return already_processed
    #text_url = guten_book["formats"].get("text/plain; charset=us-ascii")
    text_url = None
    for key, value in guten_book["formats"].items():
        if key.startswith("text/plain"):
            text_url = value
        elif key.startswith("text/html"):
            html_url = value



    cover_image_url = book["formats"].get("image/jpeg")
    title = gbook["title"]
    author = guten_book["authors"][0]["name"]
   
    if text_url:
        process_level ="processing"#await process_book(text_url,True,False) #THIS SHOULD BE CELERY TASK, process_level(url,text_url?,html_url?)
        #process_book.delay(text_url,True,False) #Celery task for once we i setup celery
        #process_level = "processing"
    
    elif html_url:
        process_level = "processing"#await process_book(html_url,False,True)
        #process_book.delay(html_url,False,True)
        #process_level="processing"
    else:
        process_level = "noContext"
    
    new_book = Book(gutenberg_id = guten_book["id"],title=title, author=author, text_url=text_url, html_url=html_url, cover_image_url=cover_image_url,process_level=process_level)
    db.add(new_book)
    try:
        db.commit()
        db.refresh(new_book)
        return new_book
    
    except IntegrityError:
        db.rollback()
        return None

    