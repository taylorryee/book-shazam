from fastapi import APIRouter,Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas.bookSchemas import bookCreate,fullBook
from app.db import get_db
from app.services import bookServices as service
from app.celery_app import celery
from celery.result import AsyncResult


router = APIRouter(prefix = "/book",tags=["Book Routes"])

@router.post("/",response_model=List[fullBook])
async def get_book(book:bookCreate,db:Session=Depends(get_db)):
    return await service.get_book(book,db)


@router.post("/process")
async def process_book(book:fullBook,db:Session=Depends(get_db)):
    
    processed_book = await service.process_book(book,db)
    if not processed_book:
        raise HTTPException(status_code = 404,detail = 'Not found')
    return processed_book

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    result = AsyncResult(task_id, app=celery)
    return {
        "status": result.status,
        "result": str(result.result),
        "file_path": result.result if result.status == "SUCCESS" else None
    }