from pydantic import BaseModel
from app.schemas.bookSchemas import bookFull

class LoginRequest(BaseModel):
    username: str

class UserBookRequest(BaseModel):
    book_id:int
    progess:int

    class Config:
        from_attributes=True
class UserFullRequest(BaseModel):
    id:int
    username:str
    email:str | None=None
    
    class Config:
        from_attributes=True

