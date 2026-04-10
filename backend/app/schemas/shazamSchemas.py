from pydantic import BaseModel



class shazamQuery(BaseModel):
    text:str
    book_id:int
    progress:int