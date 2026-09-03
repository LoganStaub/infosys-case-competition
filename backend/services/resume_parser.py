"""
Extracts plain text from an uploaded resume (PDF or Word .docx).

Deliberately in-memory only: the uploaded file is read from Flask's
FileStorage stream into memory, text is pulled out of it, and nothing is
ever written to disk. Once the caller uses the returned text, letting it
go out of scope is enough to discard it - there's no cleanup step needed
because there's nothing left to clean up.
"""

import io
from pypdf import PdfReader
from docx import Document


class ResumeParseError(Exception):
    """Raised when a resume file can't be read - wrong type, corrupted,
    password-protected, or a scanned image with no extractable text."""


def extract_resume_text(file_storage) -> str:
    """Takes a Flask FileStorage (from request.files), returns plain text.

    Raises ResumeParseError with a user-facing message on failure.
    """
    filename = (file_storage.filename or "").lower()
    raw_bytes = file_storage.read()

    if not raw_bytes:
        raise ResumeParseError("That file appears to be empty.")

    if filename.endswith(".pdf"):
        text = _extract_pdf_text(raw_bytes)
    elif filename.endswith(".docx"):
        text = _extract_docx_text(raw_bytes)
    elif filename.endswith(".doc"):
        # Old binary .doc format isn't supported by python-docx (it only
        # reads the newer .docx XML format). Rather than silently failing,
        # tell the student clearly what to do instead.
        raise ResumeParseError(
            "This looks like an older .doc file, which isn't supported - "
            "please save it as .docx or .pdf and try again."
        )
    else:
        raise ResumeParseError(
            "Please upload a .pdf or .docx file."
        )

    text = text.strip()
    if not text:
        raise ResumeParseError(
            "Couldn't find any readable text in that file - if it's a "
            "scanned image of your resume rather than a text document, "
            "try exporting a text-based version instead."
        )
    return text


def _extract_pdf_text(raw_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(raw_bytes))
        if reader.is_encrypted:
            raise ResumeParseError(
                "That PDF is password-protected - please upload an "
                "unprotected version."
            )
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except ResumeParseError:
        raise
    except Exception as exc:
        raise ResumeParseError(f"Couldn't read that PDF ({exc}).") from exc


def _extract_docx_text(raw_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(raw_bytes))
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as exc:
        raise ResumeParseError(f"Couldn't read that Word document ({exc}).") from exc
