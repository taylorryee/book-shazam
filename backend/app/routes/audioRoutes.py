from fastapi import APIRouter,Depends, File, UploadFile
from app.schemas.audioSchema import audioReturn
from app.services import audioServices as service


router = APIRouter(prefix = "/audio", tags=["Audio routes"])

@router.post("/upload",response_model = audioReturn)
async def upload_audio(audio:UploadFile=File(...)):
    audio = await service.upload_audio(audio)

    return audio

