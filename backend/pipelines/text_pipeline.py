import json
import re

from backend import gemini_engine
from backend.threat_engine import _fallback_analysis, _analyze_link


# URL extraction pattern
URL_PATTERN = re.compile(
    r"(?:https?://|www\.)[^\s<>'\"]+|\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|in|biz|info|xyz|app|me|ru|cn|tk|top)(?:/[^\s<>'\"]*)?",
    re.IGNORECASE,
)


def _extract_and_analyze_urls(text: str) -> list:
    """Extract URLs from text and analyze each one."""
    if not text:
        return []
    
    detected_links = []
    seen = set()
    
    for match in URL_PATTERN.findall(text or ""):
        cleaned = match.strip().rstrip(".,;:!?)\"]}'")
        if cleaned.lower().startswith("www."):
            cleaned = f"https://{cleaned}"
        
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen.add(key)
            analyzed = _analyze_link(cleaned)
            detected_links.append(analyzed)
    
    return detected_links


def process_text_pipeline(text: str):
    """
    Centralized text intelligence pipeline.

    Preserves existing behavior from the /analyze route in backend.app:
    - language detection (delegated to backend.app._detect_input_language via local import)
    - translation to English when needed
    - call to Gemini analysis (or fallback)
    - threat normalization / fallback
    - translate back explanation & safety_actions when original language != English
    - returns a dict matching the current API response schema
    """

    # local import to avoid circular import at module load time
    from backend.app import _detect_input_language
    from backend.gemini_engine import (
        model,
        _translate_to_english,
        _analyze_normalized_text,
        _translate_back,
        _translate_analysis_for_ui,
    )

    original_message = (text or "").strip()
    print(f"[DEBUG text_pipeline] Received text: {original_message[:200] if original_message else '(empty)'}")
    message = original_message

    detected = _detect_input_language(message)
    detected_language = detected.get("label", "English")
    detected_language_key = detected_language.lower()

    translated = False
    if detected_language_key != "english":
        # translate to english (gemini may fallback to returning the input)
        message = _translate_to_english(message, detected.get("label"))
        translated = True
        print(f"[DEBUG text_pipeline] Translated text to English: {message[:200] if message else '(empty)'}")

    normalized_text = message or original_message
    print(f"[DEBUG text_pipeline] Normalized text after translation: {normalized_text[:200] if normalized_text else '(empty)'}")

    try:
        if model is None:
            analysis = _fallback_analysis(original_message)
            analysis["detected_language"] = detected_language
            analysis["translated_to_english"] = translated
        else:
            analysis = _analyze_normalized_text(normalized_text)

        # translate back explanation and safety actions when we translated input
        if translated:
            analysis["explanation"] = _translate_back(
                analysis.get("explanation", ""), detected_language
            )

            analysis["safety_actions"] = [
                _translate_back(action, detected_language)
                for action in analysis.get("safety_actions", [])
            ]

            analysis["threat_highlights"] = [
                {
                    "snippet": _translate_back(h.get("snippet", ""), detected_language),
                    "explanation": _translate_back(h.get("explanation", ""), detected_language)
                }
                for h in analysis.get("threat_highlights", [])
            ]

        # Extract and analyze links
        detected_links = _extract_and_analyze_urls(normalized_text)
        analysis["detected_links"] = detected_links
        print(f"[DEBUG text_pipeline] Detected links: {detected_links}")

        # metadata
        analysis["detected_language"] = detected_language
        analysis["translated_to_english"] = translated

        return analysis

    except json.JSONDecodeError:
        # preserve the previous behavior: fallback analysis + localized UI payload
        normalized_text = _translate_to_english(original_message, detected.get("label"))
        analysis = _fallback_analysis(normalized_text or original_message)
        localized_analysis = _translate_analysis_for_ui(analysis, detected.get("label"))
        detected_links = _extract_and_analyze_urls(normalized_text or original_message)
        response_payload = {
            "detected_language": detected.get("label"),
            "translated_to_english": detected_language_key != "english",
            "normalized_text": normalized_text or original_message,
            "original_text": original_message,
            "translated_text": normalized_text or original_message,
            "detected_links": detected_links,
            "analysis": localized_analysis,
            "threat_highlights": localized_analysis.get("threat_highlights", []),
        }
        response_payload.update(localized_analysis)
        return response_payload

    except Exception:
        # general fallback mirrors JSON error handling
        normalized_text = _translate_to_english(original_message, detected.get("label"))
        analysis = _fallback_analysis(normalized_text or original_message)
        localized_analysis = _translate_analysis_for_ui(analysis, detected.get("label"))
        detected_links = _extract_and_analyze_urls(normalized_text or original_message)
        response_payload = {
            "detected_language": detected.get("label"),
            "translated_to_english": detected_language_key != "english",
            "normalized_text": normalized_text or original_message,
            "original_text": original_message,
            "translated_text": normalized_text or original_message,
            "detected_links": detected_links,
            "analysis": localized_analysis,
            "threat_highlights": localized_analysis.get("threat_highlights", []),
        }
        response_payload.update(localized_analysis)
        return response_payload
