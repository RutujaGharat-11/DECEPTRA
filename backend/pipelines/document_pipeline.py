import io
import os
from typing import Any, Dict

try:
    import pdfplumber
except Exception:  # pragma: no cover - optional runtime dependency
    pdfplumber = None

try:
    import docx
except Exception:  # pragma: no cover - optional runtime dependency
    docx = None

from backend.pipelines.text_pipeline import process_text_pipeline


def _read_uploaded_bytes(uploaded_file: Any) -> bytes:
    """Read bytes from a FileStorage-like object or path.

    This is intentionally small and robust: it accepts bytes, file-like objects,
    or a filesystem path string. It does not modify global state.
    """
    if uploaded_file is None:
        return b""

    # If raw bytes provided
    if isinstance(uploaded_file, (bytes, bytearray)):
        return bytes(uploaded_file)

    # If a path was provided
    if isinstance(uploaded_file, str):
        if os.path.exists(uploaded_file):
            with open(uploaded_file, "rb") as fh:
                return fh.read()
        return b""

    # File-like object (Werkzeug FileStorage, io.BytesIO, etc.)
    reader = getattr(uploaded_file, "read", None)
    if callable(reader):
        try:
            pos = None
            try:
                pos = uploaded_file.tell()
            except Exception:
                pos = None
            data = reader()
            if pos is not None:
                try:
                    uploaded_file.seek(pos)
                except Exception:
                    pass
            return data or b""
        except Exception:
            return b""

    return b""


def _extract_text_from_pdf(data: bytes) -> str:
    if not data or pdfplumber is None:
        return ""
    try:
        text_parts = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                try:
                    ptext = page.extract_text() or ""
                except Exception:
                    ptext = ""
                if ptext:
                    text_parts.append(ptext)
        return "\n".join(text_parts).strip()
    except Exception:
        return ""


def _extract_text_from_docx(data: bytes) -> str:
    if not data or docx is None:
        return ""
    try:
        document = docx.Document(io.BytesIO(data))
        paragraphs = [p.text for p in document.paragraphs if p.text and p.text.strip()]
        return "\n".join(paragraphs).strip()
    except Exception:
        return ""


def process_document_pipeline(uploaded_file: Any, filename: str = None) -> Dict[str, Any]:
    """
    Lightweight document extraction layer.

    - Supports: PDF (.pdf), DOCX (.docx), TXT (.txt)
    - Extracts text, normalizes it, and forwards to `process_text_pipeline()`
    - Returns a modality-aware response; `analysis` is the exact dict returned
      from `process_text_pipeline()`.

    This function intentionally does NOT perform threat classification,
    vector generation, OCR on images, or any AI parsing. It is a thin
    extraction layer only.
    """
    raw_bytes = _read_uploaded_bytes(uploaded_file)

    # Determine document name and extension
    doc_name = filename or getattr(uploaded_file, "filename", None) or "uploaded_document"
    _, ext = os.path.splitext(doc_name or "")
    ext = (ext or "").lower()

    extracted_text = ""
    extraction_status = "empty"
    document_type = "unsupported"

    try:
        if ext == ".pdf":
            document_type = "pdf"
            extracted_text = _extract_text_from_pdf(raw_bytes)
        elif ext == ".docx":
            document_type = "docx"
            extracted_text = _extract_text_from_docx(raw_bytes)
        elif ext == ".txt":
            document_type = "txt"
            try:
                extracted_text = raw_bytes.decode("utf-8", errors="replace").strip()
            except Exception:
                extracted_text = ""
        else:
            # Unsupported extension: leave extracted_text empty but still call pipeline
            document_type = "unsupported"

        extraction_status = "success" if extracted_text else "empty"
    except Exception:
        extraction_status = "failed"
        extracted_text = ""

    # Normalize whitespace
    normalized_text = (extracted_text or "").strip()

    # Always delegate to the centralized text pipeline (vector-first)
    try:
        analysis = process_text_pipeline(normalized_text)
    except Exception:
        # In the unlikely event process_text_pipeline raises, return graceful analysis
        # Use empty text input which the pipeline already handles safely.
        try:
            analysis = process_text_pipeline("")
        except Exception:
            analysis = {"error": "analysis_failed"}

    response = {
        "modality": "document",
        "document_type": document_type,
        "document_name": doc_name,
        "extracted_text": normalized_text,
        "extraction_status": extraction_status,
        "detected_links": analysis.get("detected_links", []),
        "analysis": analysis,
    }
    
    # Merge analysis results into top level
    if isinstance(analysis, dict):
        response.update(analysis)

    return response
