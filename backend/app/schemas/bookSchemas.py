from pydantic import BaseModel
from typing import List,Dict


class bookCreate(BaseModel):
    author:str | None=None
    title:str | None=None

class person(BaseModel):
    name: str


class fullBook(BaseModel):
    id:int | None=None
    gutenberg_id:int | None=None
    title:str
    authors:List[person] | None=None
    formats:Dict[str,str] | None=None
    text_url:str | None=None
    cover_image_url:str | None=None
    process_level:str | None=None

    class Config:
        from_attributes=True


class bookData(BaseModel):
    title:str
    id:int | None=None
    gutenberg_id:int | None=None
    authors:List[person] | None=None
    copyright:bool | None=None
    formats:Dict[str,str] | None=None

    class Config:
        from_attributes=True


class bookReturn(BaseModel):
    id:int
    title:str | None=None
    authors:List[person] | None=None
    gutenberg_id:int | None=None
    cover_image_url:str | None=None
    process_level:str

    class Config:
        from_attributes = True
