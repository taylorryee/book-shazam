from pydantic import BaseModel
from app.schemas.bookSchemas import bookFull

class LoginRequest(BaseModel):
    username: str

class UserBookRequest(BaseModel):
    progress:int
    title:str
    cover_image_url:str

    class Config:
        from_attributes=True

class UserFull(BaseModel):
    id:int
    username:str
    email:str | None=None
    
    class Config:
        from_attributes=True
