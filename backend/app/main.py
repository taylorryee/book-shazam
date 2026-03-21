from fastapi import FastAPI, Depends
from app.routes.shazamRoutes import router as shazamRouter
from app.routes.bookRoutes import router as bookRouter
from app.routes.userRoutes import router as userRouter
from app.db import Base,engine
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:19006",  # Expo web (optional)
    "http://localhost:3000",   # React web (optional)
    "*",  # allow all during development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

app.include_router(shazamRouter)
app.include_router(bookRouter)
app.include_router(userRouter)




