from pydantic import BaseModel
from typing import List,Dict


class bookCreate(BaseModel):
    author:str | None=None
    title:str | None=None

class person(BaseModel):
    birth_year: int | None
    death_year: int | None
    name: str


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
