from fastapi import APIRouter,Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas.bookSchemas import bookCreate,bookReturn,bookData
from app.db import get_db
from app.services import bookServices as service


router = APIRouter(prefix = "/book",tags=["Book Routes"])

@router.post("/",response_model=List[bookData])
async def get_book(book:bookCreate,db:Session=Depends(get_db)):
    return await service.get_book(book,db)


@router.post("/process")
async def process_book(book:bookData,db:Session=Depends(get_db)):
    
    processed_book = await service.process_book(book,db)
    if not processed_book:
        raise HTTPException(status_code = 404,detail = 'Not found')
    return processed_book