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
from app.services import userServices as service
from pydantic import BaseModel
from app.schemas.userSchemas import LoginRequest,UserBookRequest
from app.auth import get_current_user

router = APIRouter(prefix = "/user",tags=["Book Routes"])


@router.post("/login")
def login(login:LoginRequest,db:Session=Depends(get_db)):
    return service.login(login,db)

@router.get("/user_books",response_model = list[UserBookRequest])
def get_user_books(user = Depends(get_current_user),db:Session=Depends(get_db)):
    return service.get_user_books(user,db)

