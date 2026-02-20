import re, os, unicodedata
from app.celery_app import celery
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.bookModels import Book



@celery.task
def clean_text(book_id:int):
    # Normalize unicode
    db = SessionLocal()

    try:
        book = db.query(Book).get(book_id)

        text = unicodedata.normalize("NFKC", book.text)

        # Normalize line endings
        text = text.replace("\r\n", "\n")

        # Remove Gutenberg header
        start_pattern = r"\*\*\*\s*START OF.*?\*\*\*"
        start_match = re.search(start_pattern, text, re.IGNORECASE)
        if start_match:
            text = text[start_match.end():]

        # Remove Gutenberg footer
        end_pattern = r"\*\*\*\s*END OF.*?\*\*\*"
        end_match = re.search(end_pattern, text, re.IGNORECASE)
        if end_match:
            text = text[:end_match.start()]

        # Normalize smart punctuation
        replacements = {
            "“": '"',
            "”": '"',
            "‘": "'",
            "’": "'",
            "—": "-",
            "–": "-",
        }
        for k, v in replacements.items():
            text = text.replace(k, v)

        # Remove bracket-only lines
        text = re.sub(r"^\[.*?\]$", "", text, flags=re.MULTILINE)

        # Remove excessive blank lines and strip trailing whitespace
        cleaned = "\n".join(line.rstrip() for line in re.sub(r"\n{3,}", "\n\n", text).split("\n")).strip()

        book.process_level = "context"
        book.text=None
        db.commit()
        return cleaned
    except Exception as e:
        db.rollback()
        try:
            book = db.query(Book).get(book_id)
            book.process_level = "noContext"
            db.commit()
        except:
            db.rollback()
        
        raise e
        
    finally:
        db.close()





