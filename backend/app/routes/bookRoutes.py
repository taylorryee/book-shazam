from fastapi import APIRouter,Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas.bookSchemas import bookCreate,bookFull,updateBookPosition,userBook,bookAddResponse
from app.db import get_db
from app.services import bookServices as service
from app.celery_app import celery
from celery.result import AsyncResult
from app.models.bookModels import Book,BookChunk
from app.utils.bookProcessing import max_token_batch,embed_batch
from app.auth import get_current_user
from app.models.bookModels import User

router = APIRouter(prefix = "/book",tags=["Book Routes"])

from pydantic import BaseModel
from typing import List

class PageIn(BaseModel):
    index: int
    text: str
    isCover: bool | None = None
    coverImage: str | None = None
class EmbedRequest(BaseModel):
    pages: List[PageIn]
    book_id: int  # keep it simple



@router.post("/",response_model=List[bookFull])
async def get_book(book:bookCreate,db:Session=Depends(get_db), current_user: User = Depends(get_current_user)):
    
    return await service.get_book(book,db)

@router.post("/add",response_model = bookAddResponse)
def add_book(book:bookFull,db:Session=Depends(get_db),user=Depends(get_current_user)):
    return service.add_book(book,db,user)

@router.post("/process",response_model = userBook)
async def process_book(book:userBook,db:Session=Depends(get_db)):
    
    return await service.process_book(book,db)

@router.post("/embed",response_model=userBook)
async def embed_pages(req:EmbedRequest,user=Depends(get_current_user),db:Session=Depends(get_db)):
    return await service.embed_pages(req,user,db)

@router.post("/position")
def update_position(update:updateBookPosition,db:Session=Depends(get_db),user=Depends(get_current_user)):
    return service.update_position(update,db,user)


