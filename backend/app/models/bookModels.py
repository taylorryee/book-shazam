from sqlalchemy import Column,Integer,String,ForeignKey,Enum,UniqueConstraint,Text,DateTime,Index,Computed
from sqlalchemy.orm import relationship
from app.db import Base
import enum
from sqlalchemy.dialects.postgresql import ARRAY,JSONB
from datetime import datetime
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import TSVECTOR

class BookState(enum.Enum):
    noContext = "noContext" #no book context
    context = "context" #has book context
    processing = "processing"
    processed = "processed" #currently processing book
    
    uploaded = "uploaded"

    cleaned = "cleaned"
    cleaning = "cleaning"
    
    chunked = "chunked"
    chunking = "chunking"

    failed_cleaning = "failed_cleaning"
    failed_chunking = "failed_chunking"
    failed_embedding = "failed_embedding"

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

    __table_args__=(
        UniqueConstraint('title','authors'),
    )



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

class User(Base):
    __tablename__="users"
    id = Column(Integer,primary_key=True)
    username = Column(String,index=True,nullable=True)
    email = Column(String,index=True,nullable=True)

    users_books = relationship("UserBook",back_populates="user")


class UserBook(Base):
    __tablename__="users_books"
    book_id = Column(Integer,ForeignKey("books.id"),primary_key=True)
    user_id = Column(Integer,ForeignKey("users.id"),primary_key=True)
    
    progress = Column(Integer,index=True)

    user = relationship("User",back_populates="users_books")
    book = relationship("Book",back_populates="users_books")

