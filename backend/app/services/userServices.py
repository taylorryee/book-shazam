from fastapi import APIRouter,Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas.bookSchemas import bookCreate,bookFull
from app.db import get_db
from app.services import bookServices as service
from app.celery_app import celery
from celery.result import AsyncResult
from app.models.bookModels import Book,BookChunk,User,UserBook
from app.utils.bookProcessing import max_token_batch,embed_batch
from app.auth import create_access_token

def login(username: str, db: Session):
    username = username.strip().lower()

    user = db.query(User).filter(User.username == username).first()

    if not user:
        user = User(username=username)
        db.add(user)
        db.commit()
        db.refresh(user)

    token_data = {"sub": str(user.id)}
    token = create_access_token(token_data)

    return {"access_token": token}
