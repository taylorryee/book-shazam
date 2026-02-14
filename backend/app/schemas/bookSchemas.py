from pydantic import BaseModel


class bookCreate(BaseModel):
    author:str
    title:str

class bookReturn(BaseModel):
    id:int
    title:str
    author:str

    gutenberg_id:int | None=None
    text_url:str | None=None
    html_url:str | None=None
    cover_image_url:str | None=None
    process_level:str

    class Config:
        from_attributes = True
