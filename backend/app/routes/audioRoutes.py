from fastapi import APIRouter,Depends, File, UploadFile
from sqlalchemy.orm import Session
from app.schemas.audioSchemas import audioReturn
from app.services import audioServices as service
from app.db import get_db
from app.config import openai
from app.utils.rag import relevant_chunks
from app.models.bookModels import Book,BookChunk

router = APIRouter(prefix = "/audio", tags=["Audio routes"])

@router.post("/upload",response_model = audioReturn)
async def upload_audio(book_id:int,audio:UploadFile=File(...)):
    audio = await service.upload_audio(audio,book_id)

    return audio

@router.post("test")
def test(text:str,book_id:int,db:Session=Depends(get_db)):

        embedding_response = openai.embeddings.create(
            model="text-embedding-3-small",
            input=text,
        )

        embedding = embedding_response.data[0].embedding

        context = relevant_chunks(embedding,book_id,db)
        formatted_context = "\n\n".join(f"Passage {i+1}:\n{chunk}" for i, chunk in enumerate(context))
        
        book = db.get(Book,book_id)
        response = openai.responses.create(
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
                - Do NOT mention the retrieved excerpts, passages, or “context.”
                - Do NOT say phrases like “based on the provided excerpts.”
                - Do NOT explain your internal reasoning process."""
            },
            {
                "role": "user",
                "content": f"""
                Question:{text}
                Book Excerpts:{formatted_context}"""
            }
            ]
        )

        return {"response":response.output_text,
                "context":formatted_context}


