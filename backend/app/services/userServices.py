from fastapi import APIRouter,Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session,selectinload
from typing import List
from app.schemas.bookSchemas import bookCreate,bookFull
from app.db import get_db
from app.services import bookServices as service
from app.celery_app import celery
from celery.result import AsyncResult
from app.models.bookModels import Book,BookChunk,User,UserBook
from app.utils.bookProcessing import max_token_batch,embed_batch
from app.auth import create_access_token
from app.schemas.userSchemas import LoginRequest, UserFull

def login(login:LoginRequest, db: Session):
    username = login.username.strip().lower()

    user = db.query(User).filter(User.username == username).first()

    if not user:
        user = User(username=username)
        db.add(user)
        db.commit()
        db.refresh(user)

    token_data = {"sub": str(user.id)}
    token = create_access_token(token_data)

    return {"access_token": token}


def get_user_books(user,db:Session):
    user_books = db.query(UserBook).filter(UserBook.user_id==user.id).options(selectinload(UserBook.book)).all()
    
    return[{"progress":ub.progress,"title":ub.book.title,"cover_image_url":ub.book.cover_image_url}for ub in user_books]



def create_book_lines(book, lines, user, db):
    try:
        curBook = db.query(UserBook).filter(
            UserBook.book_id == book.id,
            UserBook.user_id == user.id
        ).first()

        if not curBook:
            raise HTTPException(status_code=404, detail="Book not found")

        curBook.lines = lines
        db.commit()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

