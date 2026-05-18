import io
import os
import re
from typing import Any, Dict, List

from backend.threat_engine import _analyze_link

try:
    from PIL import Image, ImageOps
except Exception:  # pragma: no cover - optional runtime dependency
    Image = None
    ImageOps = None

try:
    import pytesseract
except Exception:  # pragma: no cover - optional runtime dependency
    pytesseract = None

try:
    import cv2
except Exception:  # pragma: no cover - optional runtime dependency
    cv2 = None

try:
    import numpy as np
except Exception:
    np = None

try:
    from pyzbar.pyzbar import decode as decode_qr
except Exception:  # pragma: no cover - optional runtime dependency
    decode_qr = None


URL_PATTERN = re.compile(
    r"(?:https?://|www\.)[^\s<>'\"]+|\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|in|biz|info|xyz|app|me|ru|cn|tk|top)(?:/[^\s<>'\"]*)?",
    re.IGNORECASE,
)


def _detect_platform(text: str) -> str:
    """Detect the source platform or media type from OCR text hints."""
    if not text:
        return "Unknown"
    
    lowered = text.lower()
    
    # Platform detection heuristics
    if any(keyword in lowered for keyword in ["whatsapp", "message", "forwarded", "🔗", "chat"]):
        return "WhatsApp"
    elif any(keyword in lowered for keyword in ["instagram", "insta", "reels", "followers", "like"]):
        return "Instagram"
    elif any(keyword in lowered for keyword in ["facebook", "fb", "feed"]):
        return "Facebook"
    elif any(keyword in lowered for keyword in ["telegram"]):
        return "Telegram"
    elif any(keyword in lowered for keyword in ["email", "from:", "to:", "subject:", "inbox"]):
        return "Email"
    elif any(keyword in lowered for keyword in ["poster", "announcement", "notice", "flyer", "event"]):
        return "Poster"
    elif any(keyword in lowered for keyword in ["form", "application", "register", "signup"]):
        return "Form"
    elif any(keyword in lowered for keyword in ["twitter", "tweet", "tweet"]):
        return "Twitter/X"
    elif any(keyword in lowered for keyword in ["reddit", "subreddit", "post"]):
        return "Reddit"
    
    return "Unknown"


def _read_uploaded_bytes(uploaded_file: Any) -> bytes:
    if uploaded_file is None:
        return b""

    if isinstance(uploaded_file, (bytes, bytearray)):
        return bytes(uploaded_file)

    if isinstance(uploaded_file, str):
        if os.path.exists(uploaded_file):
            with open(uploaded_file, "rb") as handle:
                return handle.read()
        return b""

    reader = getattr(uploaded_file, "read", None)
    if callable(reader):
        current_position = None
        try:
            current_position = uploaded_file.tell()
        except Exception:
            current_position = None

        data = reader()

        if current_position is not None:
            try:
                uploaded_file.seek(current_position)
            except Exception:
                pass

        return data or b""

    return b""


def _load_image(image_bytes: bytes):
    if not image_bytes or Image is None:
        return None

    try:
        image = Image.open(io.BytesIO(image_bytes))
        if ImageOps is not None:
            image = ImageOps.exif_transpose(image)
        return image.convert("RGB")
    except Exception:
        return None


def _preprocess_for_tesseract(pil_image):
    """Basic preprocessing: grayscale, optional denoise, and thresholding using OpenCV if available.

    Returns a PIL Image suitable for pytesseract.
    """
    if pil_image is None:
        return None

    if cv2 is None:
        # No OpenCV: return the original PIL image
        return pil_image

    try:
        arr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR) if 'np' in globals() else cv2.cvtColor(pil_image, cv2.COLOR_RGB2BGR)
    except Exception:
        try:
            import numpy as _np

            arr = cv2.cvtColor(_np.array(pil_image), cv2.COLOR_RGB2BGR)
        except Exception:
            return pil_image

    try:
        # convert to gray
        gray = cv2.cvtColor(arr, cv2.COLOR_BGR2GRAY)
        # denoise
        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        # adaptive threshold (helps in many scanned images)
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        # convert back to RGB PIL image
        from PIL import Image as _PILImage

        return _PILImage.fromarray(cv2.cvtColor(thresh, cv2.COLOR_GRAY2RGB))
    except Exception:
        return pil_image


def _extract_ocr_text(pil_image) -> str:
    """Return OCR text string using pytesseract. Supports English, Hindi, Marathi if tesseract langs installed."""
    if pil_image is None or pytesseract is None:
        return ""

    # preprocess image
    proc = _preprocess_for_tesseract(pil_image)

    # Specify languages: eng, hin (Hindi), mar (Marathi). These language packs must be installed in Tesseract.
    lang = "eng+hin+mar"
    config = "--psm 6"

    try:
        text = pytesseract.image_to_string(proc, lang=lang, config=config)
        return text or ""
    except Exception:
        try:
            # fallback to default language
            return pytesseract.image_to_string(proc, config=config) or ""
        except Exception:
            return ""


def _extract_qr_payloads(pil_image) -> List[str]:
    if pil_image is None or decode_qr is None:
        return []

    try:
        decoded = decode_qr(pil_image)
    except Exception:
        try:
            # try converting to RGB array
            import numpy as _np

            decoded = decode_qr(_np.array(pil_image))
        except Exception:
            return []

    payloads: List[str] = []
    seen = set()
    for item in decoded or []:
        payload = getattr(item, "data", b"")
        if not payload:
            continue
        if isinstance(payload, bytes):
            payload_text = payload.decode("utf-8", errors="replace").strip()
        else:
            payload_text = str(payload).strip()
        if not payload_text:
            continue
        key = payload_text.lower()
        if key in seen:
            continue
        seen.add(key)
        payloads.append(payload_text)
    return payloads


def _extract_urls(text):
    """Extract URLs from text and analyze each one using shared analysis."""
    urls = []
    seen = set()
    for match in URL_PATTERN.findall(text or ""):
        cleaned = match.strip().rstrip(".,;:!?)\"]}'")
        if cleaned.lower().startswith("www."):
            cleaned = f"https://{cleaned}"
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen.add(key)
            analyzed = _analyze_link(cleaned)
            urls.append(analyzed)
    return urls


def _compose_text_for_analysis(ocr_text, qr_payloads, suspicious_urls):
    parts = []

    if ocr_text:
        parts.append(ocr_text)

    for payload in qr_payloads or []:
        parts.append(f"QR payload: {payload}")

    for url in suspicious_urls or []:
        parts.append(f"Suspicious URL: {url}")

    return "\n".join(parts).strip()


def process_image_pipeline(uploaded_file):
    """Extract image text and QR data, then hand the combined text to the text pipeline."""

    image_bytes = _read_uploaded_bytes(uploaded_file)
    image = _load_image(image_bytes)

    extracted_text = (_extract_ocr_text(image) or "").strip()
    print(f"[DEBUG image_pipeline] OCR extracted text: {extracted_text[:200] if extracted_text else '(empty)'}")

    qr_payloads = _extract_qr_payloads(image)
    print(f"[DEBUG image_pipeline] QR payloads: {qr_payloads}")

    detected_links = _extract_urls("\n".join([extracted_text, "\n".join(qr_payloads)]))
    print(f"[DEBUG image_pipeline] Detected links: {detected_links}")

    combined_text = _compose_text_for_analysis(extracted_text, qr_payloads, detected_links)
    print(f"[DEBUG image_pipeline] Combined text for analysis: {combined_text[:200] if combined_text else '(empty)'}")

    # Call text pipeline lazily to avoid circular import
    analysis_result: Dict[str, Any] = {}
    try:
        from backend.pipelines.text_pipeline import process_text_pipeline

        analysis_result = process_text_pipeline(combined_text)
    except Exception as exc:  # pragma: no cover - if missing or failing, return extraction-only payload
        analysis_result = {"_text_pipeline_error": True, "_text_pipeline_error_msg": str(exc)}

    # Detect platform from content hints
    platform_detected = _detect_platform(extracted_text)

    # Compose enhanced response schema with modality awareness (flattened)
    response: Dict[str, Any] = {
        "modality": "image",
        "extracted_text": extracted_text,
        "detected_links": detected_links,
        "qr_data": qr_payloads,
        "platform_detected": platform_detected,
        "analysis": analysis_result,
        "extraction_method": "pytesseract + pyzbar",
        "extraction_status": "success" if (extracted_text or qr_payloads or detected_links) else "no_text_detected",
    }
    
    # Merge analysis results into top level
    if isinstance(analysis_result, dict):
        response.update(analysis_result)

    return response
