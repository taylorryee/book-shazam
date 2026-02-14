from fastapi import APIRouter,Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.schemas.bookSchemas import bookCreate,bookReturn
from app.db import get_db
from app.services import bookServices as service


router = APIRouter(prefix = "/book",tags=["Book Routes"])

@router.post("/",response_model = bookReturn)
async def create_book_frame(book:bookCreate,db:Session=Depends(get_db)):
    
    processed_book = await service.create_book_frame(book,db)
    if not processed_book:
        raise HTTPException(status_code = 404,detail = 'Not found')
    return processed_book