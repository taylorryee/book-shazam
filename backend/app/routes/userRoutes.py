from fastapi import APIRouter,Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas.bookSchemas import bookCreate,bookFull,userBook
from app.db import get_db
from app.services import bookServices as service
from app.celery_app import celery
from celery.result import AsyncResult
from app.models.bookModels import Book,BookChunk
from app.utils.bookProcessing import max_token_batch,embed_batch
from app.services import userServices as service
from pydantic import BaseModel
from app.schemas.userSchemas import LoginRequest,UserLinesRequest
from app.auth import get_current_user

router = APIRouter(prefix = "/user",tags=["Book Routes"])


@router.post("/login")
def login(login:LoginRequest,db:Session=Depends(get_db)):
    return service.login(login,db)

@router.get("/user_books",response_model = list[userBook])
def get_all_user_books(user = Depends(get_current_user),db:Session=Depends(get_db)):
    return service.get_all_user_books(user,db)

@router.post("/lines")
def create_book_lines(payload: UserLinesRequest, user=Depends(get_current_user), db:Session=Depends(get_db)):
    return service.create_book_lines(payload.book, payload.lines, user, db)


class pageReturn(BaseModel):
    text:str
    index:int
    isCover: bool | None = None
    coverImage: str | None = None

    class Config:
        from_attributes = True

@router.get("/pages",response_model = list[pageReturn])
def get_book_pages(book_id:int,user=Depends(get_current_user),db:Session=Depends(get_db)):
    return service.get_book_pages(book_id,user,db)
