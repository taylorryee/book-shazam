import re

def clean_text(text:str):
    """
    Cleans a Project Gutenberg text file by:
    - Removing header and footer boilerplate
    - Normalizing line endings
    - Removing excessive blank lines
    - Stripping trailing whitespace
    """

    # Normalize line endings (Windows -> Unix)
    text = text.replace("\r\n", "\n")

    # Remove Gutenberg header
    start_pattern = r"\*\*\* START OF .*?\*\*\*"
    start_match = re.search(start_pattern, text, re.IGNORECASE)
    if start_match:
        text = text[start_match.end():]

    # Remove Gutenberg footer
    end_pattern = r"\*\*\* END OF .*?\*\*\*"
    end_match = re.search(end_pattern, text, re.IGNORECASE)
    if end_match:
        text = text[:end_match.start()]

    # Remove excessive blank lines (3+ → 2)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Strip trailing whitespace on each line
    text = "\n".join(line.rstrip() for line in text.split("\n"))

    return text.strip()
