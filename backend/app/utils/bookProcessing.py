import re, os
import unicodedata
from app.celery_app import celery


@celery.task
def clean_text(text: str):
    # Normalize unicode
    text = unicodedata.normalize("NFKC", text)

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

    # Ensure directory exists
    #dir_path = os.path.dirname(file_path)
    #if dir_path:
     #   os.makedirs(dir_path, exist_ok=True)

    # Write to file
    #with open(file_path, "w", encoding="utf-8") as f:
     #   f.write(cleaned)

    return cleaned





