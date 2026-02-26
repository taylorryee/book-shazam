from app.config import openai
from app.celery_app import celery
import os
from app.db import SessionLocal
from sqlalchemy.orm import Session
from app.models.bookModels import BookChunk


def relevant_chunks(embedding: list[float], db: Session):
    
    relevant = db.query(BookChunk).order_by(BookChunk.embedding.cosine_distance(embedding)).limit(5).all()
    return [chunk.text for chunk in relevant]

celery.task()
def process_audio(file_path:str):
    db = SessionLocal()
    try:

        with open(file_path,"rb") as f:
            transcript = openai.audio.transcriptions.create( 
                model="whisper-1",
                file=f
            )

        response = openai.embeddings.create(
            model="text-embedding-3-small",
            input=transcript.text,
        )

        os.remove(file_path)

        embedding = response.data[0].embedding




    
    except Exception as e:
        raise e
    finally:
        db.close()
    