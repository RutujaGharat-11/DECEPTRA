"""Voice transcription utilities backed by Deepgram.

This module stays intentionally small and isolated: it only handles
transcription and language detection for prerecorded audio files.
"""

from __future__ import annotations

import json
import mimetypes
import os
import re
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

try:
	from dotenv import load_dotenv
except Exception:  # pragma: no cover - optional in some environments
	load_dotenv = None


if load_dotenv is not None:
	load_dotenv()


DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen"
LANGUAGE_LABELS = {
	"en": "English",
	"hi": "Hindi",
	"mr": "Marathi",
}


def _read_audio_bytes(file_path: str) -> bytes:
	if not file_path:
		return b""

	if not os.path.exists(file_path):
		return b""

	try:
		with open(file_path, "rb") as handle:
			return handle.read()
	except Exception:
		return b""


def _normalize_transcript(text: str) -> str:
	if not text:
		return ""
	return re.sub(r"\s+", " ", text).strip()


def _normalize_language_label(language_value: Optional[str]) -> str:
	if not language_value:
		return "Unknown"

	language_key = str(language_value).strip().lower().split("-", 1)[0]
	if language_key in LANGUAGE_LABELS:
		return LANGUAGE_LABELS[language_key]

	return str(language_value).strip().title() or "Unknown"


def _extract_transcript_payload(payload: Dict[str, Any]) -> Dict[str, str]:
	metadata = payload.get("metadata") or {}
	results = payload.get("results") or {}
	channels = results.get("channels") or []

	transcript = ""
	if channels:
		first_channel = channels[0] or {}
		alternatives = first_channel.get("alternatives") or []
		if alternatives:
			transcript = alternatives[0].get("transcript", "") or ""

	language_value = (
		metadata.get("detected_language")
		or metadata.get("language")
		or payload.get("detected_language")
		or payload.get("language")
	)

	return {
		"transcript": _normalize_transcript(transcript),
		"language": _normalize_language_label(language_value),
	}


def transcribe_audio(file_path: str) -> Dict[str, Any]:
	"""Transcribe a prerecorded audio file with Deepgram.

	The request lets Deepgram detect English, Hindi, or Marathi automatically.
	The returned transcript is whitespace-normalized so callers get a clean
	text payload without extra spacing or line breaks.
	"""

	api_key = os.getenv("DEEPGRAM_API_KEY", "").strip()
	if not api_key:
		return {"success": False, "language": "Unknown", "transcript": ""}

	audio_bytes = _read_audio_bytes(file_path)
	if not audio_bytes:
		return {"success": False, "language": "Unknown", "transcript": ""}

	content_type, _ = mimetypes.guess_type(file_path)
	if not content_type:
		content_type = "application/octet-stream"

	query_string = urlencode(
		{
			"model": "nova-2",
			"detect_language": "true",
			"punctuate": "true",
			"smart_format": "true",
		}
	)
	request_url = f"{DEEPGRAM_API_URL}?{query_string}"
	request = Request(
		request_url,
		data=audio_bytes,
		headers={
			"Authorization": f"Token {api_key}",
			"Content-Type": content_type,
		},
		method="POST",
	)

	try:
		with urlopen(request, timeout=60) as response:
			response_payload = json.loads(response.read().decode("utf-8"))
	except HTTPError:
		return {"success": False, "language": "Unknown", "transcript": ""}
	except URLError:
		return {"success": False, "language": "Unknown", "transcript": ""}
	except Exception:
		return {"success": False, "language": "Unknown", "transcript": ""}

	extracted = _extract_transcript_payload(response_payload or {})
	return {
		"success": bool(extracted["transcript"]),
		"language": extracted["language"],
		"transcript": extracted["transcript"],
	}
 

def process_voice_pipeline(file_path: str) -> dict:
	"""High-level voice pipeline used by the Flask app.

	Performs transcription then runs the centralized text pipeline to
	produce the same `analysis` shape returned by text processing.
	This function avoids top-level imports that could cause circular
	imports by importing the text pipeline locally.
	"""
	result = transcribe_audio(file_path)
	transcript = (result.get("transcript") or "").strip()
	language = result.get("language", "Unknown")
	analysis = {}
	if transcript:
		try:
			from backend.pipelines.text_pipeline import process_text_pipeline
			analysis = process_text_pipeline(transcript) or {}
		except Exception:
			analysis = {}

	# Ensure minimal expected keys so callers in `app.py` behave unchanged
	analysis.setdefault("detected_language", language)
	analysis.setdefault("translated_to_english", False)

	return {
		"success": bool(result.get("success", False)),
		"transcript": transcript,
		"language": language,
		"analysis": analysis,
	}
  