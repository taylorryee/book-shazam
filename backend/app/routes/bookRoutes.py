from fastapi import APIRouter,Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas.bookSchemas import bookCreate,bookFull
from app.db import get_db
from app.services import bookServices as service
from app.celery_app import celery
from celery.result import AsyncResult
from app.models.bookModels import Book,BookChunk
from app.utils.bookProcessing import max_token_batch,embed_batch

router = APIRouter(prefix = "/book",tags=["Book Routes"])

@router.get("/")
def get_book_test(id: int, db: Session = Depends(get_db)):
    chunks = db.query(BookChunk).filter(BookChunk.book_id == id).all()

    if not chunks:
        raise HTTPException(400, "aw man")

    response = []
    for chunk in chunks:
        print("CHUNK ",chunk.embedding)
        print("\nText",chunk.text)

   

    return response


@router.post("/",response_model=List[bookFull])
async def get_book(book:bookCreate,db:Session=Depends(get_db)):
    return await service.get_book(book,db)


@router.post("/process",response_model = bookFull)
async def process_book(book:bookFull,db:Session=Depends(get_db)):
    
    processed_book = await service.process_book(book,db)
    if not processed_book:
        raise HTTPException(status_code = 404,detail = 'Not found')
    return processed_book

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    result = AsyncResult(task_id, app=celery)
    return {
        "status": result.status,
        "result": str(result.result)
    }


@router.post("/embeddingTest")
def embed_book(id, db: Session=Depends(get_db)):
    book = db.query(Book).get(id)
    all_embeddings = []

    for batch in max_token_batch(book.chunks, 100_000):
        embedded = embed_batch(batch)
        print(embedded,flush=True)
        all_embeddings.extend(embedded)
    print(len(book.chunks),"len book",len(all_embeddings),flush=True)
    return len(book.chunks) == len(all_embeddings)
