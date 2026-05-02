from sqlalchemy import Column,Integer,String,ForeignKey,Boolean,Enum,UniqueConstraint,Text,DateTime,Index,Computed,ForeignKeyConstraint
from sqlalchemy.orm import relationship
from app.db import Base
import enum
from sqlalchemy.dialects.postgresql import ARRAY,JSONB
from datetime import datetime
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import TSVECTOR

class BookState(enum.Enum):
    added = "added"

    processing = "processing"
    processed = "processed"

    embedding = "embedding"
    embedded = "embedded"

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer,primary_key=True)
    gutenberg_id = Column(Integer,unique=True,index=True,nullable=True)
    title = Column(String,index=True)
    authors = Column(ARRAY(String),index=True, nullable=True)
    formats = Column(JSONB,index=True,nullable=True)
    text_url = Column(String,index=True,nullable=True)
    cover_image_url = Column(String,index=True,nullable=True)
    process_level = Column(Enum(BookState),index=True)
    text = Column(Text,nullable=True)
    claimed_at = Column(DateTime,nullable=True,index=True)
    chunks = Column(JSONB,nullable=True)
    
    book_chunks = relationship("BookChunk",back_populates="books")


    users_books = relationship("UserBook",back_populates="book")


class BookChunk(Base):
    __tablename__="book_chunks"
    id = Column(Integer,primary_key=True)
    chunk_index = Column(Integer,index=True)
    text = Column(Text)
    embedding = Column(Vector(1536))
    text_search = Column(
        TSVECTOR,
        Computed("to_tsvector('english', text)", persisted=True)
    )

    book_id = Column(Integer,ForeignKey("books.id"))
    books = relationship("Book",back_populates="book_chunks")

    __table_args__=(
        Index(
            "bookchunks_embedding_hnsw_idx",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index(
            "idx_chunks_text_search",
            "text_search",
            postgresql_using="gin"
        ),

    )

class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True)
    index = Column(Integer, index=True)
    text = Column(Text)
    embedding = Column(Vector(1536))
    isCover = Column(Boolean,index=True,nullable=True)
    coverImage = Column(String,index=True,nullable=True)

    userBook_id = Column(Integer, ForeignKey("users_books.id"))

    userBook = relationship(
        "UserBook",
        back_populates="pages",
        foreign_keys=[userBook_id]
    )


class User(Base):
    __tablename__="users"
    id = Column(Integer,primary_key=True)
    username = Column(String,index=True,unique=True,nullable=True)
    email = Column(String,index=True,unique=True,nullable=True)


    users_books = relationship("UserBook",back_populates="user")


class UserBook(Base):
    __tablename__="users_books"

    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    progress = Column(Integer, index=True)
    lines = Column(JSONB, nullable=True)

    user = relationship("User", back_populates="users_books")
    book = relationship("Book", back_populates="users_books")

    pages = relationship("Page", back_populates="userBook")