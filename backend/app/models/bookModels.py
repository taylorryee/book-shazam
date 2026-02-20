from sqlalchemy import Column,Integer,String,ForeignKey,Enum,UniqueConstraint,Text
from sqlalchemy.orm import relationship
from app.db import Base
import enum
from sqlalchemy.dialects.postgresql import ARRAY,JSONB


class ProcessLevel(enum.Enum):
    noContext = "noContext" #no book context
    context = "context" #has book context
    processing = "processing" #currently processing book

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer,primary_key=True)
    gutenberg_id = Column(Integer,unique=True,index=True,nullable=True)
    title = Column(String,index=True)
    authors = Column(ARRAY(String),index=True, nullable=True)
    formats = Column(JSONB,index=True,nullable=True)
    text_url = Column(String,index=True,nullable=True)
    cover_image_url = Column(String,index=True,nullable=True)
    process_level = Column(Enum(ProcessLevel),index=True)
    text = Column(Text,nullable=True)
    
    bookChunks = relationship("BookChunks",back_populates="books")

    __table__args=(
        UniqueConstraint('title','authors')
    )

class BookChunks(Base):
    __tablename__="bookChunks"
    id = Column(Integer,primary_key=True)
    chunk = Column(Text)
    
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