from fastapi import UploadFile
from app.schemas.audioSchemas import audioReturn
import tempfile
import asyncio
from app.config import openai
import os
from app.utils.rag import process_audio

async def upload_audio(audio:UploadFile,book_id:int):


    file_extension = os.path.splitext(audio.filename)[1] #gets audio type, mp3, wav etc

    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp: #creates a temporary file on disk that you can write too.
        tmp.write(await audio.read())#read from the audio file which is of type UploadFile, we await because UploadFile is an async type
        tmp_path = tmp.name
    file = open(tmp_path,"rb")
    process_audio.delay(tmp_path,book_id)
    #transcript = await asyncio.to_thread(lambda:openai.audio.transcriptions.create( #the call to openai is blocking so we pass that work off to another thread so it doesnt block the event loop.
     #   model="whisper-1",
      #  file=open(tmp_path, "rb")
    #)) 


    return audioReturn(text="processing")
