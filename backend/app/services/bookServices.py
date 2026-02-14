from app.schemas.bookSchemas import bookCreate
from app.models.bookModels import Book

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import httpx
import json

def process_book(url,t,f):
    return "processing"

async def create_book_frame(book:bookCreate,db:Session):
    already_processed = db.query(Book).filter(Book.title == book.title,Book.author == book.author).first()
    
    if already_processed:
        return already_processed
    
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://gutendex.com/books/", params={"search": book.title})
        data = resp.json()
        #print(data,flush=True)
    if data["count"] == 0: #book dont exist in gutenberg
        return None
    

    guten_book = data["results"][0]
    #text_url = guten_book["formats"].get("text/plain; charset=us-ascii")
    text_url = None
    for key, value in guten_book["formats"].items():
        if key.startswith("text/plain"):
            text_url = value
            break
    html_url = guten_book["formats"].get("text/html")

    cover_image_url = guten_book["formats"].get("image/jpeg")
    title = guten_book["title"]
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

    