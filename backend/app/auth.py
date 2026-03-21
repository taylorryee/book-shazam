from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status,Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from app.db import get_db
from app.models.bookModels import User,Book,UserBook


from dotenv import load_dotenv
load_dotenv()


# -----------------------------
# Password hashing
# -----------------------------
# pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# def hash_password(password: str) -> str:
#     return pwd_context.hash(password)

# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     return pwd_context.verify(plain_password, hashed_password)

# -----------------------------
# JWT settings
# -----------------------------
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 1000 #SUPER HIGH FOR TESTING - NEEDS TO BE CHANGED FOR PRODUCTION

#oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/login") #This tells FastAPI
#This endpoint uses OAuth2 Bearer tokens. When a user calls a protected route, look in the 
# Authorization: Bearer <token> header and pass the token string into the dependency.

# -----------------------------
# JWT creation
# -----------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None): #This function creates the token
    to_encode = data.copy()#Creates a shallow copy of data(in our case this would be username)
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))#This is the expire
    #field for the token payload
    to_encode.update({"exp": expire})#This adds the expieration time to the data
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)#This encodes the username and experation 
    #into a toke using your secrete key and chosen algorith,
    return encoded_jwt

# -----------------------------
# Get current user dependency
# -----------------------------
credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

def get_current_user(authorization:Optional[str]=Header(None), db: Session = Depends(get_db)):

    print("AUTH HEADER:", authorization)

    if authorization is None or not authorization.startswith("Bearer "):
        raise credentials_exception
    token = authorization.split(" ", 1)[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])#Decodes access token into original dicitonary if
        #with the username and expiration date if the signature is valid and not expired
        id = int(payload.get("sub"))#Gets the user id from dictionary
        if id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == id).first()#Finds the user associated with the 
    #username
    if user is None:
        raise credentials_exception
    return user

def decode_token(token:str):#using this for websocket since they dont send jwt in header like http
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id = int(payload.get("sub"))
        if id is None:
            raise credentials_exception
        return id
    
    except JWTError:
        raise credentials_exception

