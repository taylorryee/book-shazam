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


    

def start_reading_text(book:bookFull,text:str,db:Session):
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
    
    

async def upload_audio(audio:UploadFile,book_id:int):
    file_extension = os.path.splitext(audio.filename)[1] #gets audio type, mp3, wav etc

    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp: #creates a temporary file on disk that you can write too.
        tmp.write(await audio.read())#read from the audio file which is of type UploadFile, we await because UploadFile is an async type
        tmp_path = tmp.name
    
    answer = await process_audio(tmp_path,book_id)


    return audioReturn(text=answer)



def stream_book(book:bookFull,start_position:int,db:Session):
    try:
        chunks = db.query(BookChunk).filter(BookChunk.book_id == book.id,BookChunk.chunk_index >= start_position).order_by(BookChunk.chunk_index).limit(10).all()
        return chunks
    except Exception as e:
        raise e
    
