from fastapi import APIRouter,Depends, File, UploadFile
from sqlalchemy.orm import Session
from app.schemas.audioSchemas import audioReturn
from app.services import shazamServices as service
from app.db import get_db
from app.config import openai
from app.utils.rag import relevant_chunks
from app.models.bookModels import Book,BookChunk
from app.schemas.bookSchemas import bookFull
from app.auth import get_current_user
from app.models.bookModels import User
from app.schemas.shazamSchemas import shazamQuery
from fastapi.responses import StreamingResponse
from fastapi import WebSocket,WebSocketDisconnect
import json
router = APIRouter(prefix = "/shazam", tags=["Shazam routes"])

@router.post("/start_text")
def start_text(book:bookFull,text:str,db:Session=Depends(get_db), current_user: User = Depends(get_current_user)):
    start = service.start_text(book,text,db)
    if not start:
         return None
    return start


@router.post("/upload",response_model = audioReturn)
async def upload_audio(book:bookFull,audio:UploadFile=File(...), current_user: User = Depends(get_current_user)):
    audio = await service.upload_audio(audio,book)

    return audio

# @router.post("/query")
# def upload_query(query:shazamQuery,db:Session=Depends(get_db),current_user:User=Depends(get_current_user)):
#      return service.upload_query(query,db,current_user)

@router.post("/query")
def query_stream(
    query: shazamQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return StreamingResponse(
        service.upload_query(query, db, current_user),
        media_type="text/plain; charset=utf-8",
    )



@router.websocket("/ws/query")
async def shazam_ws(websocket: WebSocket,db:Session=Depends(get_db)):
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            if data.get("type") != "query":
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Unsupported message type"
                }))
                continue

            text = data["text"]
            book_id = data["book_id"]
            progress = data.get("progress")

            try:
                # 1. embedding
                embedding_response = openai.embeddings.create(
                    model="text-embedding-3-small",
                    input=text,
                )
                embedding = embedding_response.data[0].embedding

                # 2. retrieve context
                context = relevant_chunks(embedding, book_id, db)
                formatted_context = "\n\n".join(
                    f"Passage {i+1}:\n{chunk}" for i, chunk in enumerate(context)
                )

                book = db.get(Book, book_id)
                if book is None:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Book not found"
                    }))
                    continue

                instructions = f"""You are an intelligent literary assistant helping users understand this book: {book.title}.

You will be given:
1) A user question
2) Excerpts from {book.title}

Your job:
- First determine whether the retrieved passages are relevant to the user's question.
- If they are relevant, use them to answer accurately.
- If they are not relevant, ignore them and answer using your general knowledge of the book.
- If the question is interpretive, provide thoughtful analysis.
- If the question is factual, answer clearly and concisely.
- Do NOT mention the retrieved excerpts, passages, or context.
- Do NOT explain your internal reasoning process.
"""

                user_input = f"""
Question: {text}

Book Excerpts:
{formatted_context}
"""

                # 3. stream OpenAI -> websocket
                with openai.responses.stream(
                    model="o4-mini",
                    instructions=instructions,
                    input=user_input,
                ) as stream:
                    for event in stream:
                        if event.type == "response.output_text.delta":
                            await websocket.send_text(json.dumps({
                                "type": "delta",
                                "text": event.delta,
                            }))

                    stream.get_final_response()

                await websocket.send_text(json.dumps({"type": "done"}))

            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": str(e),
                }))

    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        db.close()
# def upload_text(query:shazamQuery, current_user: User = Depends(get_current_user)):

#         embedding_response = openai.embeddings.create(
#             model="text-embedding-3-small",å
#             input=text,
#         )

#         embedding = embedding_response.data[0].embedding

#         context = relevant_chunks(embedding,book_id,db)
#         formatted_context = "\n\n".join(f"Passage {i+1}:\n{chunk}" for i, chunk in enumerate(context))
        
#         book = db.get(Book,book_id)
#         response = openai.responses.create(
#             model = "gpt-5-nano",
#             input=[
#             {
#                 "role": "system",
#                 "content":f"""You are an intelligent literary assistant helping users understand this book: {book.title}.

#                 You will be given:
#                 1) A user question
#                 2) Exceprts from {book.title} that may or may not be relevant

#                 Your job:

#                 - First determine whether the retrieved passages are relevant to the user's question.
#                 - If they are relevant, use them to answer accurately.
#                 - If they are not relevant, ignore them and answer using your general knowledge of the book.
#                 - If the question is interpretive (e.g., asking about meaning, symbolism, themes), provide thoughtful analysis.
#                 - If the question is factual (e.g., plot details, character names), answer clearly and concisely.
#                 - Do NOT mention the retrieved excerpts, passages, or “context.”
#                 - Do NOT say phrases like “based on the provided excerpts.”
#                 - Do NOT explain your internal reasoning process."""
#             },
#             {
#                 "role": "user",
#                 "content": f"""
#                 Question:{text}
#                 Book Excerpts:{formatted_context}"""
#             }
#             ]
#         )

#         return {"response":response.output_text,
#                 "context":formatted_context}


# @router.get("/stream_book")
# def stream_book(book:bookFull,start_position:int,db:Session=Depends(get_db), current_user: User = Depends(get_current_user)):
#      return service.stream_book(book,start_position,db)
