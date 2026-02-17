from app.schemas.bookSchemas import bookCreate,bookData
from app.models.bookModels import Book
from app.utils.bookProcessing import clean_text

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import httpx,json,requests
from fastapi import HTTPException



#create_book_frame helper functions


async def get_book(book:bookCreate,db:Session):
    if not book.title and not book.author:
        raise HTTPException(400,"Needs a title or an author")
    
    if book.title:
        already_processed_title = db.query(Book).filter(func.lower(Book.title)==book.title.lower()).all()
        if already_processed_title:
            return already_processed_title

    query = " ".join(filter(None, [book.title, book.author]))

    async with httpx.AsyncClient() as client:
        resp = await client.get("https://gutendex.com/books/", params={"search":query})
        data = resp.json()
        #print(data,flush=True)
    
    if data["count"] == 0: #book dont exist in gutenberg
        raise HTTPException(404,"Book not found")

    ans = []
    for book in data["results"]: #Get every book that shows up for what the user requested
        ans.append(bookData(gutenberg_id=book["id"],title=book["title"],authors=book["authors"],formats=book["formats"],copyright=book["copyright"]))
    
    return ans


async def process_book(book:bookData,db:Session):
    #already_processed = db.query(Book).filter(Book.gutenberg_id == book.gutenberg_id)

    ##   return already_processed
    
    text_url = (book.formats.get("text/plain; charset=utf-8") or 
                book.formats.get("text/plain") or 
                book.formats.get("text/plain; charset=us-ascii"))
    
    response = await requests.get(text_url)

    cleaned_text = clean_text(response.text)
    
    return cleaned_text

    
