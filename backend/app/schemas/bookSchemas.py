from pydantic import BaseModel
from typing import List,Dict


class bookCreate(BaseModel):
    author:str | None=None
    title:str | None=None

class Person(BaseModel):
    birth_year: int | None
    death_year: int | None
    name: str


class gutendexBook(BaseModel):
    id:int
    title:str
    authors:List[Person]
    copyright:bool | None
    formats:dict[str,str]


class bookReturn(BaseModel):
    id:int
    title:str | None=None
    authors:List[str] | None=None

    gutenberg_id:int | None=None
    text_url:str | None=None
    html_url:str | None=None
    cover_image_url:str | None=None
    process_level:str

    class Config:
        from_attributes = True
