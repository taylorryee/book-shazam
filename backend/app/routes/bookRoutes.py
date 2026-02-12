from fastapi import APIRouter,Depends, File, UploadFile
from sqlalchemy.orm import Session
from app.schemas.bookSchemas import bookCreate,bookReturn
from app.db import get_db
from app.services import bookServices as service


router = APIRouter(prefix = "/book",tags=["Book Routes"])

@router.get("/",response_model = bookReturn)
async def get_book(book:bookCreate,db:Session=Depends(get_db)):
    
    processed_book = await service.get_book(book,db)
    
    return processed_book