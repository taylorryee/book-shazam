from app.config import openai
from app.celery_app import celery
import os
from app.db import SessionLocal
from sqlalchemy.orm import Session
from app.models.bookModels import BookChunk,Book
from app.schemas.bookSchemas import bookFull
import asyncio


def relevant_chunks(embedding: list[float],book_id:int, db: Session):
    relevant = db.query(BookChunk).order_by(BookChunk.embedding.cosine_distance(embedding)).filter(BookChunk.book_id==book_id).limit(5).all()
    return [chunk.text for chunk in relevant]


def db_work(book_id:int,embedding:list[float]):
    db=SessionLocal()
    try:
        book = db.get(Book,book_id)
        if not book:
            return None
        context = relevant_chunks(embedding,book_id,db)
        return context,book
    finally:
        db.close()

async def process_audio(file_path:str,book_id:int):
    try:
        with open(file_path,"rb") as f:
            transcript = await openai.audio.transcriptions.create( 
                model="whisper-1",
                file=f
            )

        embedding_response = await openai.embeddings.create(
            model="text-embedding-3-small",
            input=transcript.text,
        )

        embedding = embedding_response.data[0].embedding

        context,book = await asyncio.to_thread(db_work,book_id,embedding)
       
        formatted_context = "\n\n".join(f"Passage {i+1}:\n{chunk}" for i, chunk in enumerate(context))
        
        response = await openai.responses.create(
            model = "gpt-5-nano",
            input=[
            {
                "role": "system",
                "content":f"""You are an intelligent literary assistant helping users understand this book: {book.title}.

                You will be given:
                1) A user question
                2) Exceprts from {book.title} that may or may not be relevant

                Your job:

                - First determine whether the retrieved passages are relevant to the user's question.
                - If they are relevant, use them to answer accurately.
                - If they are not relevant, ignore them and answer using your general knowledge of the book.
                - If the question is interpretive (e.g., asking about meaning, symbolism, themes), provide thoughtful analysis.
                - If the question is factual (e.g., plot details, character names), answer clearly and concisely.
                - Do NOT hallucinate events that do not happen in the book.
                - If you do not know the answer, say so."""
            },
            {
                "role": "user",
                "content": f"""
                Question:{transcript.text}
                Book Excerpts:{formatted_context}"""
            }
            ]
        )

        return response.output_text

    except Exception as e:
        raise e
    finally:
        os.remove(file_path)
    