from pydantic import BaseModel
from typing import List,Dict


class bookCreate(BaseModel):
    author:str | None=None
    title:str | None=None

class person(BaseModel):
    name: str

class BookChunk(BaseModel):
    chunk_index:int
    text:str
    token_count:int
    embedding:List[float] | None = None
    class Config:
        from_attributes = True

class bookFull(BaseModel):
    id:int | None=None
    gutenberg_id:int | None=None
    title:str
    authors:List[str] = []
    formats:Dict[str,str] = {}
    text_url:str | None=None
    cover_image_url:str | None=None
    process_level:str | None

    chunks:List[BookChunk] | None=None


    class Config:
        from_attributes=True


