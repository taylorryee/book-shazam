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
from app.schemas.userSchemas import LoginRequest

router = APIRouter(prefix = "/user",tags=["Book Routes"])


@router.post("/login")
def login(login:LoginRequest,db:Session=Depends(get_db)):
    return service.login(login,db)
