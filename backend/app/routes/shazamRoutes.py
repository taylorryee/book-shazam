from fastapi import APIRouter,Depends, File, UploadFile,HTTPException,status
from sqlalchemy.orm import Session
from app.schemas.audioSchemas import audioReturn
from app.services import shazamServices as service
from app.db import get_db
from app.config import openai
from app.utils.rag import relevant_chunks,recent_pages
from app.models.bookModels import Book,BookChunk
from app.schemas.bookSchemas import bookFull
from app.auth import get_current_user
from app.models.bookModels import User
from app.schemas.shazamSchemas import shazamQuery
from fastapi.responses import StreamingResponse
from fastapi import WebSocket,WebSocketDisconnect
import json
from jose import jwt, JWTError
import os
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

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.websocket("/ws/query")
async def shazam_ws(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except JWTError:
        await websocket.close(code=1008)
        return

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        await websocket.close(code=1008)
        return

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

            text = data.get("text", "").strip()
            book_id = data.get("book_id")
            progress = data.get("progress")

            if not text or book_id is None or progress is None:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Missing text, book_id, or progress"
                }))
                continue

            try:
                book = db.get(Book, book_id)
                if book is None:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Book not found"
                    }))
                    continue

                pages = recent_pages(progress, book_id, user, db)

                current_page = next((p for p in pages if p.index == progress), None)
                previous_pages = [p for p in pages if p.index < progress]

                if current_page is None:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Current page not found"
                    }))
                    continue

                formatted_context = "\n\n".join(
                    f"Page {p.index}:\n{p.text}" for p in reversed(previous_pages)
                )

                instructions = """You are an intelligent literary assistant helping users understand a book.

Rules:
- Answer only using the provided pages.
- Do not mention or infer events beyond the provided pages.
- If the answer is not supported by the provided pages, say you do not have enough context yet.
- If the question is interpretive, provide thoughtful analysis based on provided pages.
- If the question is factual, answer based on provided pages.
- Do not explain your internal reasoning process.
"""

                user_input = f"""
Question:
{text}

Current Page:
Page {current_page.index}\n
{current_page.text}

Earlier Pages:
{formatted_context}
"""

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