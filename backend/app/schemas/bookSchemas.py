from pydantic import BaseModel


class bookCreate(BaseModel):
    author:str
    title:str

class bookReturn(BaseModel):
    id:int
    title:str
    author:str

    gutenberg_id:int
    url:str
    image_url:str
    process_level:str
