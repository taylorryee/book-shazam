from fastapi import FastAPI, Depends
from app.routes.audioRoutes import router as audioRouter

app = FastAPI()


app.include_router(audioRouter)