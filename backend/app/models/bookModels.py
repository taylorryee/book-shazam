from sqlalchemy import Column,Integer,String,ForeignKey,Enum,UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base


class ProcessLevel(Enum):
    noContext = "noContext" #no book context
    context = "context" #has book context
    processing = "processing" #currently processing book

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer,primary_key=True)
    gutenberg_id = Column(Integer,unique=True,index=True)
    title = Column(String,index=True)
    author = Column(String,index=True)
    text_url = Column(String,index=True,nullable=True)
    html_url = Column(String,index=True,nullable=True)
    cover_image_url = Column(String,unique=True,index=True,nullable=True)
    process_level = Column(Enum(ProcessLevel),index=True)

    __table__args=(
        UniqueConstraint('title','author')
    )



class ProccessedBook(Base):
    __tablename__ = "processedBooks"
    id = Column(Integer,primary_key=True)