import json
import os

import google.generativeai as genai
from dotenv import load_dotenv

from backend.threat_engine import _extract_json, _fallback_analysis, _normalize_analysis

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Keep startup resilient; the Flask route still falls back cleanly when this is missing.
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
model_name_env = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
model = genai.GenerativeModel(model_name_env) if GEMINI_API_KEY else None
MODEL_NAME = model_name_env


def _detect_language(text):
    prompt = f"""
    Detect the language of this text.
    Only return one word: english, hindi, or marathi.
    If mixed language, return "hindi".

    Text: {text}
    """
    try:
        response = model.generate_content(prompt)
        return (response.text or "").strip().lower()
    except:
        return "english"


def _translate_to_english(text, detected_language):
    cleaned = (text or "").strip()
    if not cleaned or detected_language == "English" or model is None:
        return cleaned

    prompt = f"""
Translate the following text to English.

Rules:
- Preserve meaning exactly.
- Do not summarize, explain, or omit anything.
- Keep names, numbers, links, and codes intact.
- Return strict JSON only.

Source language: {detected_language}
Text:
{json.dumps(cleaned)}

Return exactly this JSON schema:
{{
  "translated_text": "English translation"
}}
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        raw_text = getattr(response, "text", "") or ""
        translated = (_extract_json(raw_text).get("translated_text") or "").strip()
        return translated or cleaned
    except Exception:
        return cleaned


def _translate_back(text, target_lang):
    prompt = f"""
    Translate the following text to {target_lang}.

    Text:
    {text}
    """
    try:
        response = model.generate_content(prompt)
        return (response.text or "").strip()
    except:
        return text


def _translate_analysis_for_ui(analysis, target_language):
    if target_language == "English" or model is None:
        return analysis

    source_explanation = str(analysis.get("explanation") or "").strip()
    source_actions = analysis.get("safety_actions")
    if not isinstance(source_actions, list):
        source_actions = []
    source_actions = [str(item).strip() for item in source_actions if str(item).strip()]

    if not source_explanation and not source_actions:
        return analysis

    prompt = f"""
Translate the following cybersecurity analysis output from English to {target_language}.

Rules:
- Preserve meaning exactly.
- Do not summarize, add, or remove any safety guidance.
- Keep URLs, numbers, product names, and technical terms intact.
- Return strict JSON only.

Explanation:
{json.dumps(source_explanation)}

Safety actions:
{json.dumps(source_actions)}

Return exactly this JSON schema:
{{
  "explanation": "Translated explanation",
  "safety_actions": ["action 1", "action 2", "action 3"]
}}
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        translated_payload = _extract_json(getattr(response, "text", "") or "")
        translated_explanation = str(translated_payload.get("explanation") or "").strip()
        translated_actions = translated_payload.get("safety_actions")
        if not isinstance(translated_actions, list):
            translated_actions = source_actions
        translated_actions = [str(item).strip() for item in translated_actions if str(item).strip()]

        localized = dict(analysis)
        localized["explanation"] = translated_explanation or source_explanation
        localized["safety_actions"] = translated_actions or source_actions
        return localized
    except Exception:
        return analysis


def _analyze_normalized_text(message):
    if model is None:
        return _fallback_analysis(message)

    prompt = f"""
You are a cybersecurity threat detection assistant specializing in phishing, scams, business email compromise, credential theft, and social engineering.

Analyze the message in a structured way before assigning a final risk level and category.

Step 1: Evaluate the message for these threat factors:
- urgency pressure: urgent, immediately, act now, limited time, final warning
- authority impersonation: bank, government, IRS, company security team, fraud department, police, official support
- financial request: fees, transfers, payment requests, gift cards, crypto, refunds, deposits, rewards requiring payment
- credential harvesting: OTP, password, PIN, login request, account verification code
- phishing links: suspicious URLs, shortened links, login or verification links
- emotional manipulation: fear, panic, threats, account suspension, family emergency, pressure to comply
- suspicious offers or rewards: prizes, winnings, bonuses, free gifts, exclusive rewards
- recruitment/onboarding pressure: fake HR, student placement, job promises, internship offers

Step 2: Contextually reason and classify the Scam Type. 
Do not rely on simple keyword matching. Infer the MOST LIKELY category based on conversation intent, manipulation patterns, and social engineering behavior.
Examples of specific classifications:
- Fake Internship Scam: fake HR + student recruitment + rewards
- Job Scam: fake placement/job promises
- Banking Fraud: KYC urgency + banking pressure
- Investment Scam: guaranteed returns + financial incentives
- OTP Scam: requests for OTP/verification codes
- Crypto Scam: Telegram trading manipulation + crypto incentives
- Loan Scam: easy loan promises + processing fees
- General Phishing: generic credential/link harvesting

Step 3: Assign the final risk level:
- HIGH if the message requests money, impersonates authority, contains a phishing link, or asks for OTPs or credentials
- MEDIUM if the message contains suspicious offers, vague urgency, or reward scam characteristics without direct credential/payment theft indicators
- LOW if it appears to be casual conversation with no manipulation indicators

Step 4: Return STRICT JSON only. Do not include markdown, commentary, or any text outside the JSON object.

The explanation must be 3 to 4 sentences and clearly describe:
- which manipulation techniques were detected
- why the message is suspicious
- what risk it poses to the user

Step 5: Extract "Threat Highlights". Extract the strongest suspicious snippets directly from the analyzed content and populate the `threat_highlights` array with meaningful evidence.
- Use REAL extracted content only. Do NOT hallucinate snippets.
- Extract only the strongest suspicious indicators. Avoid excessive or noisy highlights.
- Prefer manipulation-heavy phrases (e.g., urgency, authority, financial pressure, recruitment pressure, and social engineering indicators).
- For each snippet, provide a short human-readable "reason" of what signal it triggered.
- Limit to 1-3 highlights. MUST populate the `threat_highlights` JSON array.
The safety_actions array must contain exactly 3 short, context-specific recommendations.

Message to analyze:
{json.dumps(message)}

Return exactly this JSON schema:
{{
  "risk_level": "LOW | MEDIUM | HIGH",
  "risk_color": "blue | yellow | red",
  "scam_type": "Specific Scam Category",
  "confidence_score": 0,
  "signals": ["signal 1", "signal 2"],
  "explanation": "3-4 sentence explanation",
  "urgency_level": 0,
  "authority_claim": 0,
  "emotional_pressure": 0,
  "financial_request": 0,
  "threat_highlights": [
    {{
      "snippet": "exact phrase from content",
      "reason": "short signal explanation"
    }}
  ],
  "safety_actions": ["action 1", "action 2", "action 3"]
}}
"""

    # --- Gemini API call with full exception protection ---
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        raw_text = getattr(response, "text", "") or ""
        if not raw_text.strip():
            import logging
            logging.getLogger(__name__).warning(
                "Gemini returned an empty response body; using fallback analysis."
            )
            return _fallback_analysis(message)
        return _normalize_analysis(_extract_json(raw_text), message)
    except Exception as gemini_exc:
        import logging
        logging.getLogger(__name__).error(
            f"Gemini generate_content failed: {gemini_exc}", exc_info=True
        )
        return _fallback_analysis(message)


def _generate_explanation_from_vectors(message, vectors, signals, risk_level):
    """
    NEW VECTOR-FIRST ARCHITECTURE: Gemini explains already-detected threats.
    
    Receives:
    - message: original text
    - vectors: urgency_level, authority_claim, emotional_pressure, financial_request (already generated)
    - signals: list of detected signals
    - risk_level: already classified risk (LOW, MEDIUM, HIGH)
    
    Returns:
    - explanation string (3-4 sentences describing the threat)
    
    CRITICAL: This function does NOT generate vectors. It RECEIVES them as input.
    Gemini's role is EXPLANATION only, not threat detection.
    """
    if model is None:
        return ""
    
    signals_text = ", ".join(signals) if signals else "no clear signals"
    
    prompt = f"""
You are a cybersecurity threat explanation specialist. Your task is to EXPLAIN an already-detected threat.

DO NOT re-detect or re-score the threat. The threat has ALREADY been analyzed by our keyword-based detection engine.

INPUT THREAT ANALYSIS (already computed):
- Risk Level: {risk_level}
- Detected Signals: {signals_text}
- Urgency Score: {vectors.get('urgency_level', 0)}/100
- Authority Impersonation Score: {vectors.get('authority_claim', 0)}/100
- Emotional Pressure Score: {vectors.get('emotional_pressure', 0)}/100
- Financial Request Score: {vectors.get('financial_request', 0)}/100

YOUR TASK:
Provide a brief, clear explanation (2-3 sentences) of what manipulation techniques were detected and what risk they pose.

Keep the explanation concise and focused on:
1. Which specific manipulation techniques were found
2. Why this is a security risk
3. What the user should NOT do

IMPORTANT: Do not suggest changes to the risk level or scores. They are already computed.

Message analyzed:
{json.dumps(message[:500])}  # Limit to first 500 chars

Return ONLY plain text explanation (no JSON, no markdown, no bullet points). Maximum 150 words.
"""
    
    try:
        response = model.generate_content(prompt)
        explanation = (getattr(response, "text", "") or "").strip()
        
        # Validate response length
        if len(explanation) > 500:
            explanation = explanation[:500]
        
        if not explanation:
            return ""
        
        return explanation
    
    except Exception as e:
        print(f"[DEBUG gemini_engine] Error generating explanation: {str(e)}")
        return ""
