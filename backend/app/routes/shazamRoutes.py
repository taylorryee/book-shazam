from fastapi import APIRouter,Depends, File, UploadFile,HTTPException,status
from sqlalchemy.orm import Session
from app.schemas.audioSchemas import audioReturn
from app.services import shazamServices as service
from app.db import get_db
from app.config import openai
from app.utils.rag import relevant_chunks,relevant_pages
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
async def shazam_ws(websocket: WebSocket,db:Session=Depends(get_db)):
    await websocket.accept()
    
    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            token = websocket.query_params.get("token")
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])#Decodes access token into original dicitonary if
        #with the username and expiration date if the signature is valid and not expired
                id = int(payload.get("sub"))#Gets the user id from dictionary
                if id is None:
                    raise credentials_exception
            except JWTError:
                raise credentials_exception

            user = db.query(User).filter(User.id == id).first()#Finds the user associated with the 
    #username
            if user is None:
                raise credentials_exception


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
                #context = relevant_chunks(embedding, progress, book_id, db)
                context = relevant_pages(embedding,progress,book_id,user,db)
                formatted_context = "\n\n".join(
                    f"Page {i+1}:\n{chunk.text}" for i, chunk in enumerate(context)
                )
                print(formatted_context)
                book = db.get(Book, book_id)
                if book is None:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Book not found"
                    }))
                    continue

                instructions = f"""You are an intelligent literary assistant helping users understand a book.

You will be given:
1) A user question
2) The pages of a book

Your job:
- If the question is interpretive, provide thoughtful analysis based on provided pages.
- If the question is factual, answer clearly and concisely based on provided pages.
- Do NOT explain your internal reasoning process.
"""

                user_input = f"""
Question: {text}

Book Pages:
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
