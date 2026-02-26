from sqlalchemy import Column,Integer,String,ForeignKey,Enum,UniqueConstraint,Text,DateTime,Index
from sqlalchemy.orm import relationship
from app.db import Base
import enum
from sqlalchemy.dialects.postgresql import ARRAY,JSONB
from datetime import datetime
from pgvector.sqlalchemy import Vector

class BookState(enum.Enum):
    noContext = "noContext" #no book context
    context = "context" #has book context
    
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

    __table__args=(
        UniqueConstraint('title','authors')
    )



class BookChunk(Base):
    __tablename__="book_chunks"
    id = Column(Integer,primary_key=True)
    chunk_index = Column(Integer,index=True)
    text = Column(Text)
    embedding = Column(Vector(1536))

    book_id = Column(Integer,ForeignKey("books.id"))
    books = relationship("Book",back_populates="book_chunks")

    __table__args=(
        Index(
            "bookchunks_embedding_hnsw_idx",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
    

class UserBook(Base):
    __tablename__="userBooks"
    id = Column(Integer,primary_key=True)
    title = Column(String,)
    cleaned_file = Column(Text)

