from openai import AsyncOpenAI
import os
from dotenv import load_dotenv

load_dotenv()

openai = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)
