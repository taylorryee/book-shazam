from fastapi import FastAPI, Depends
from app.routes.audioRoutes import router as audioRouter
from app.routes.bookRoutes import router as bookRouter
from app.db import Base,engine

app = FastAPI()

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

app.include_router(audioRouter)
app.include_router(bookRouter)