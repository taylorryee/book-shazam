from sqlalchemy import Column,Integer,String,ForeignKey,Enum,UniqueConstraint,Text,DateTime
from sqlalchemy.orm import relationship
from app.db import Base
import enum
from sqlalchemy.dialects.postgresql import ARRAY,JSONB
from datetime import datetime


class BookState(enum.Enum):
    noContext = "noContext" #no book context
    context = "context" #has book context
    
    processed = "processed" #currently processing book
    
    uploaded = "uploaded"

    cleaned = "cleaned"
    cleaning = "cleaning"
    
    chunked = "chunked"
    chunking = "chunking"

    failed = "failed"

class ChunkState(enum.Enum):
    embedded = "embedded"
    embedding = "embedding"


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
    chunks = Column(ARRAY(String),index=True,nullable=True)
    
    bookChunks = relationship("BookChunks",back_populates="books")

    __table__args=(
        UniqueConstraint('title','authors')
    )

class BookChunks(Base):
    __tablename__="bookChunks"
    id = Column(Integer,primary_key=True)
    chunk = Column(Text)
    process_level = Column(Enum(ChunkState),index=True)
    
    book_id = Column(Integer,ForeignKey("books.id"))
    books = relationship("Book",back_populates="bookChunks")
    

class UserBook(Base):
    __tablename__="userBooks"
    id = Column(Integer,primary_key=True)
    title = Column(String,)
    cleaned_file = Column(Text)

class ProccessedBook(Base):
    __tablename__ = "processedBooks"
    id = Column(Integer,primary_key=True)