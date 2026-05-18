import json
import re


SIGNAL_PATTERNS = {
    "Urgency Pressure": [
        "urgent",
        "immediately",
        "act now",
        "limited time",
        "right now",
        "asap",
        "within 24 hours",
        "within 1 hour",
        "final warning",
        "expires today",
        "do not ignore",
        "failure to",
        "failure to respond",
        "action required",
        "response required",
        "immediate action",
        "must verify",
        "must confirm",
        "तुरंत",
        "अभी",
        "जल्दी",
        "शीघ्र",
        "तात्काळ",
        "आता",
        "abhi",
        "turant",
        "jaldi",
        "tatkal",
        "tatkaal",
    ],
    "Authority Impersonation": [
        "bank",
        "government",
        "irs",
        "company security team",
        "security team",
        "fraud department",
        "tax office",
        "police",
        "microsoft support",
        "paypal",
        "amazon",
        "official notice",
        "dear customer",
        "dear user",
        "dear member",
        "your account will be",
        "your account has been",
        "we have detected",
        "we noticed unusual",
        "verify your identity",
        "confirm your identity",
        "re-verify",
        "reverify",
        "बैंक",
        "बँक",
        "खाता",
        "खाते",
        "account locked",
        "account suspended",
        "account blocked",
        "account will be suspended",
        "account will be closed",
        "account will be terminated",
        "खाता बंद",
        "खाते बंद",
        "band ho jayega",
        "block ho jayega",
        "freeze",
        "suspend",
    ],
    "Financial Request": [
        "payment",
        "transfer",
        "wire",
        "send money",
        "fee",
        "deposit",
        "gift card",
        "bitcoin",
        "crypto",
        "refund fee",
        "processing fee",
        "पैसे",
        "पैसा",
        "रुपये",
        "शुल्क",
        "फीस",
        "पेमेंट",
        "upi",
        "bank details",
        "account details",
        "paise",
        "rupaye",
        "payment",
    ],
    "Credential Harvesting": [
        "otp",
        "one-time password",
        "password",
        "passcode",
        "pin",
        "cvv",
        "verification code",
        "login",
        "sign in",
        "confirm your credentials",
        "ओटीपी",
        "पासवर्ड",
        "पासकोड",
        "verification",
        "verify code",
    ],
    "Phishing Links": [
        "http://",
        "https://",
        "www.",
        "bit.ly",
        "tinyurl",
        "is.gd",
        "ow.ly",
        "cutt.ly",
        "buff.ly",
        "t.co",
        "click the link",
        "click here",
        "verify here",
        "login here",
        "open this link",
        "tap the link",
        "tap here",
        "register here",
        "complete registration",
        "लिंक",
        "दुवा",
        "लिंक पर क्लिक करें",
        "link par click",
        "link par click karo",
        "click karo",
        "klick karo",
    ],
    "Emotional Manipulation": [
        "panic",
        "fear",
        "you will lose",
        "suspended",
        "frozen",
        "family emergency",
        "please help",
        "warning",
        "last chance",
        "serious issue",
        "डर",
        "घबराइए",
        "मदद",
        "घाबरू नका",
        "चिंता",
    ],
    "Suspicious Offers": [
        "reward",
        "won",
        "winner",
        "prize",
        "bonus",
        "free gift",
        "cash reward",
        "claim now",
        "exclusive offer",
        "limited offer",
        "offer",
        "इनाम",
        "बक्षीस",
    ],
    "Account Security Threats": [
        "account compromised",
        "account is compromised",
        "security alert",
        "unusual activity",
        "verify your account",
        "account locked",
        "account suspended",
        "reset your account",
        "खाता बंद",
        "खाते बंद",
        "बंद हो जाएगा",
        "locked",
        "blocked",
        "freeze",
        "सुरक्षा चेतावनी",
    ],
}

HIGH_RISK_SIGNALS = {
    "Authority Impersonation",
    "Financial Request",
    "Credential Harvesting",
    "Phishing Links",
}


def _extract_json(text):
    """Parse the first JSON object from Gemini output, even when wrapped in prose or code fences."""
    cleaned = (text or "").strip()
    if not cleaned:
        raise json.JSONDecodeError("Empty Gemini response", cleaned, 0)

    fenced_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if fenced_match:
        cleaned = fenced_match.group(1).strip()

    block_match = re.search(r"\{[\s\S]*\}", cleaned)
    if block_match:
        cleaned = block_match.group(0).strip()

    return json.loads(cleaned)


def _count_keyword_hits(text, keywords):
    lowered = (text or "").lower()
    total = 0
    for keyword in keywords:
        escaped = re.escape(keyword.lower())
        if re.search(r"[a-z0-9]", keyword.lower()):
            pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"
        else:
            pattern = escaped
        total += len(re.findall(pattern, lowered))
    return total


def _contains_any(text, keywords):
    lowered = (text or "").lower()
    return _count_keyword_hits(lowered, keywords) > 0


def _to_score(value, default_value):
    """Convert value to an int score clamped to 0-100."""
    try:
        numeric = int(round(float(value)))
    except (TypeError, ValueError):
        numeric = int(default_value)
    return max(0, min(100, numeric))


def _generate_highlights_from_patterns(message):
    """Extracts fallback highlights based on keyword matching if the AI fails."""
    highlights = []
    text_lower = (message or "").lower()
    
    for signal_name, keywords in SIGNAL_PATTERNS.items():
        if len(highlights) >= 3:
            break
        for keyword in keywords:
            escaped = re.escape(keyword.lower())
            if re.search(r"[a-z0-9]", keyword.lower()):
                pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"
            else:
                pattern = escaped
                
            matches = list(re.finditer(pattern, text_lower))
            if matches:
                # Find the surrounding text containing the match (approx 30 chars each side)
                match = matches[0]
                start = max(0, match.start() - 30)
                end = min(len(message), match.end() + 30)
                
                # Snap to spaces
                while start > 0 and message[start] not in ' \n':
                    start -= 1
                while end < len(message) and message[end] not in ' \n':
                    end += 1
                    
                snippet = message[start:end].strip()
                if len(snippet) > 5:
                    highlights.append({
                        "snippet": snippet,
                        "explanation": f"{signal_name} detected"
                    })
                break  # one snippet per signal
                
    return highlights


def generate_threat_vectors(text):
    """
    CENTRALIZED DETERMINISTIC THREAT VECTOR ENGINE
    
    This is the SINGLE source of truth for threat vector generation.
    All modalities (text, OCR/image, documents, audio) must use this function.
    Uses SIGNAL_PATTERNS to ensure consistency with signal detection.
    
    Returns dict with 4 vectors, NEVER 0 if indicators present.
    """
    lowered = (text or "").strip().lower()
    
    if not lowered:
        return {
            "urgency_level": 0,
            "authority_claim": 0,
            "emotional_pressure": 0,
            "financial_request": 0,
        }
    
    # === URGENCY_LEVEL (0-100) ===
    # Uses SIGNAL_PATTERNS for consistency with signal detection
    urgency_hits = _count_keyword_hits(lowered, SIGNAL_PATTERNS.get("Urgency Pressure", []))
    
    # Boost urgency for time-sensitive patterns
    if re.search(r"\b\d+\s*(minutes?|hours?|days?)\b", lowered):
        urgency_hits += 1
    if "!" in lowered:
        urgency_hits += min(1, lowered.count("!") // 2)
    if re.search(r"(now|today|urgent|suspend|freeze|block|immediately)", lowered):
        urgency_hits += 1
    
    if urgency_hits == 0:
        urgency_level = 0
    elif urgency_hits == 1:
        urgency_level = 45
    elif urgency_hits <= 2:
        urgency_level = 65
    else:
        urgency_level = min(90, 70 + (urgency_hits - 2) * 8)
    
    # AUTHORITY_CLAIM (0-100)
    authority_hits = _count_keyword_hits(lowered, SIGNAL_PATTERNS.get("Authority Impersonation", []))
    authority_hits += _count_keyword_hits(lowered, SIGNAL_PATTERNS.get("Account Security Threats", []))
    if re.search(r"(official|support|team|department|security)", lowered):
        authority_hits += 1
    if re.search(r"(account.*locked|account.*suspended|account.*blocked)", lowered):
        authority_hits += 2
    
    # Boost authority for impersonation-style domain patterns in text
    if re.search(r"(paypal|amazon|netflix|microsoft|apple|google|facebook|instagram|whatsapp|linkedin)[\-_]?\.?[a-z0-9]+\.[a-z]{2,}", lowered):
        authority_hits += 3
    # Shortened URLs hiding destination
    if re.search(r"(bit\.ly|tinyurl\.com|is\.gd|ow\.ly|t\.co|cutt\.ly|buff\.ly)/", lowered):
        authority_hits += 2
    # Registration/external form links
    if re.search(r"(register|registration|verify|verification|confirm|re-verify)[\s\-_]*(here|now|link|url|form|at|on)", lowered):
        authority_hits += 2

    if authority_hits == 0:
        authority_claim = 0
    elif authority_hits == 1:
        authority_claim = 35
    elif authority_hits <= 2:
        authority_claim = 55
    else:
        authority_claim = min(90, 60 + (authority_hits - 2) * 10)
    
    # EMOTIONAL_PRESSURE (0-100)
    emotional_hits = _count_keyword_hits(lowered, SIGNAL_PATTERNS.get("Emotional Manipulation", []))
    if re.search(r"(reward|prize|won|winner|bonus|exclusive|congratulations|selected)", lowered):
        emotional_hits += 1
    if re.search(r"(panic|fear|afraid|scared|will lose|don't miss|last chance)", lowered):
        emotional_hits += 1
    
    if emotional_hits == 0:
        emotional_pressure = 0
    elif emotional_hits == 1:
        emotional_pressure = 20
    elif emotional_hits <= 2:
        emotional_pressure = 40
    else:
        emotional_pressure = min(90, 45 + (emotional_hits - 2) * 12)
    
    # FINANCIAL_REQUEST (0-100) - STRONGEST VECTOR
    financial_hits = _count_keyword_hits(lowered, SIGNAL_PATTERNS.get("Financial Request", []))
    credential_hits = _count_keyword_hits(lowered, SIGNAL_PATTERNS.get("Credential Harvesting", []))
    
    if credential_hits > 0 and financial_hits > 0:
        financial_request = 85
    elif credential_hits >= 1:
        financial_request = min(100, 70 + credential_hits * 10)
    elif financial_hits == 0:
        financial_request = 0
    elif financial_hits == 1:
        financial_request = 25
    elif financial_hits <= 2:
        financial_request = 50
    else:
        financial_request = min(100, 60 + (financial_hits - 2) * 10)
    
    # === AGGRESSIVE FLOOR ENFORCEMENT ===
    # Get all detected signals (includes regex-based detection like URLs)
    signals_detected = _signals_from_message_cues(text)
    signal_set = {str(item).strip().lower() for item in signals_detected}
    
    # Always apply floors if ANY signal detected (not just keyword hits)
    if signal_set:
        # Ensure each vector has minimum value when its signal is detected
        if "urgency pressure" in signal_set and urgency_level < 30:
            urgency_level = 30
        if "authority impersonation" in signal_set and authority_claim < 30:
            authority_claim = 30
        if "emotional manipulation" in signal_set and emotional_pressure < 25:
            emotional_pressure = 25
        if "financial request" in signal_set and financial_request < 30:
            financial_request = 30
        if "credential harvesting" in signal_set and financial_request < 75:
            financial_request = 75
        if "phishing links" in signal_set:
            # Phishing detected - boost urgency significantly
            if urgency_level < 35:
                urgency_level = 35
            # Also add some authority concern (impersonation risk)
            if authority_claim < 20:
                authority_claim = 20
        if "suspicious offers" in signal_set and emotional_pressure < 25:
            emotional_pressure = 25
        # If ANY signal detected but all vectors still 0, apply minimum baseline
        if urgency_level == 0 and authority_claim == 0 and emotional_pressure == 0 and financial_request == 0:
            urgency_level = 20
            authority_claim = 15
            emotional_pressure = 15
            financial_request = 15
    
    return {
        "urgency_level": int(urgency_level),
        "authority_claim": int(authority_claim),
        "emotional_pressure": int(emotional_pressure),
        "financial_request": int(financial_request),
    }


def _heuristic_indicator_levels(message):
    """
    DEPRECATED: Use generate_threat_vectors() instead.
    Kept for backward compatibility - delegates to centralized engine.
    """
    return generate_threat_vectors(message)


def _normalize_signal_name(signal):
    signal = str(signal or "").strip()
    normalized_map = {
        "urgency": "Urgency Pressure",
        "urgency tactics": "Urgency Pressure",
        "authority": "Authority Impersonation",
        "authority claim": "Authority Impersonation",
        "impersonation": "Authority Impersonation",
        "financial": "Financial Request",
        "money request": "Financial Request",
        "credential request": "Credential Harvesting",
        "credentials": "Credential Harvesting",
        "otp request": "Credential Harvesting",
        "phishing": "Phishing Links",
        "phishing link": "Phishing Links",
        "emotional pressure": "Emotional Manipulation",
        "emotion": "Emotional Manipulation",
        "reward scam": "Suspicious Offers",
        "reward claim": "Suspicious Offers",
    }
    return normalized_map.get(signal.lower(), signal)


def _dedupe_list(items):
    deduped = []
    seen = set()
    for item in items or []:
        normalized = str(item or "").strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(normalized)
    return deduped


def _signals_from_message_cues(message):
    """Derive scam signals directly from text to reduce misses."""
    print(f"[DEBUG threat_engine] _signals_from_message_cues received message: {message[:200] if message else '(empty)'}")
    
    derived = []
    text = (message or "").lower()

    for signal_name, keywords in SIGNAL_PATTERNS.items():
        if _contains_any(text, keywords):
            derived.append(signal_name)

    if re.search(r"(?:https?://|www\.|bit\.ly|tinyurl|[a-z0-9-]+\.(?:com|net|org|co|info|ru|xyz))(?:/\S*)?", text):
        if "Phishing Links" not in derived:
            derived.append("Phishing Links")

    if (
        _contains_any(text, SIGNAL_PATTERNS["Credential Harvesting"])
        and _contains_any(text, ["verify", "confirm", "submit", "enter", "share", "send"])
        and "Credential Harvesting" not in derived
    ):
        derived.append("Credential Harvesting")

    return _dedupe_list(derived)


def _classify_risk(signals, message, indicators, ai_risk_level=None):
    """
    COMPOUND RISK ESCALATION ENGINE
    
    Each indicator contributes a weighted score to a compound total.
    The final verdict is decided by the total, not individual if/return chains.
    This ensures multiple weak signals together produce a higher verdict
    than any single indicator alone.
    
    Score thresholds:
        >= 80  -> HIGH
        >= 40  -> MEDIUM
        < 40   -> LOW (or AI fallback)
    """
    signal_set = {str(item).strip().lower() for item in (signals or [])}
    lowered = (message or "").lower()

    # --- Detect all indicators ---
    has_money_request    = "financial request" in signal_set or _contains_any(lowered, SIGNAL_PATTERNS["Financial Request"])
    has_authority        = "authority impersonation" in signal_set or _contains_any(lowered, SIGNAL_PATTERNS["Authority Impersonation"])
    has_link             = "phishing links" in signal_set or bool(re.search(r"(?:https?://|www\.|bit\.ly|tinyurl)", lowered))
    has_credentials      = "credential harvesting" in signal_set or _contains_any(lowered, SIGNAL_PATTERNS["Credential Harvesting"])
    has_otp              = _contains_any(lowered, ["otp", "one-time password"])
    has_offer            = "suspicious offers" in signal_set or _contains_any(lowered, SIGNAL_PATTERNS["Suspicious Offers"])
    has_urgency          = "urgency pressure" in signal_set or indicators.get("urgency_level", 0) >= 35
    has_emotional        = "emotional manipulation" in signal_set or indicators.get("emotional_pressure", 0) >= 35
    has_account_threat   = bool(re.search(r"(account.*?(suspend|block|lock|close|terminat)|suspend.*?account)", lowered))
    has_shortened_url    = bool(re.search(r"(bit\.ly|tinyurl|is\.gd|ow\.ly|t\.co|cutt\.ly|buff\.ly)/", lowered))
    has_impersonation_domain = bool(re.search(
        r"(paypal|amazon|netflix|microsoft|apple|google|facebook|instagram|whatsapp|linkedin)[\-_]?\.?[a-z0-9]+\.[a-z]{2,}", lowered
    ))
    has_verification_pressure = bool(re.search(
        r"(verify|confirm|re-verify|reverify|validate).*?(account|identity|information|detail)", lowered
    ))
    suspicious_count = sum(
        1
        for flag in (
            has_money_request,
            has_authority,
            has_link,
            has_credentials,
            has_otp,
            has_offer,
            has_urgency,
            has_emotional,
            has_account_threat,
            has_shortened_url,
            has_impersonation_domain,
            has_verification_pressure,
        )
        if flag
    )

    # --- Compound scoring: each indicator adds weighted points ---
    score = 0

    # High-weight indicators (30-40 pts each)
    if has_credentials:          score += 40
    if has_money_request:        score += 35
    if has_impersonation_domain: score += 35
    if has_account_threat:       score += 30
    if has_otp:                  score += 30

    # Medium-weight indicators (20-25 pts each)
    if has_urgency:                  score += 25
    if has_authority:                score += 25
    if has_verification_pressure:    score += 25
    if has_shortened_url:            score += 25
    if has_link:                     score += 20

    # Low-weight indicators (10-15 pts each)
    if has_emotional:    score += 15
    if has_offer:        score += 10

    # Compound escalation: co-occurring indicators should reinforce each other,
    # not be flattened by a weak average.
    if suspicious_count >= 2:
        score += (suspicious_count - 1) * 6
    if suspicious_count >= 4:
        score += 10
    if suspicious_count >= 5:
        score += 12
    if has_urgency and (has_link or has_shortened_url) and (has_authority or has_account_threat or has_impersonation_domain):
        score += 30
    if has_impersonation_domain and (has_shortened_url or has_link):
        score += 20
    if has_account_threat and has_verification_pressure:
        score += 20
    if has_urgency and has_verification_pressure:
        score += 12

    # --- Combo multipliers: co-occurring dangerous pairs push score up ---
    if has_credentials and has_urgency:            score += 25
    if has_authority and has_credentials:          score += 25
    if has_money_request and has_urgency:          score += 25
    if has_money_request and has_authority:        score += 20
    if has_otp and has_authority:                  score += 25
    if (has_link or has_shortened_url) and has_urgency and (has_authority or has_account_threat):
        score += 25
    if has_impersonation_domain and (has_urgency or has_credentials or has_link):
        score += 25
    if has_account_threat and has_verification_pressure:
        score += 20

    # Multi-indicator phishing patterns should not stay in LOW territory just
    # because no single vector dominates on its own.
    if suspicious_count >= 4 and (has_urgency or has_authority or has_link or has_shortened_url or has_impersonation_domain or has_account_threat or has_verification_pressure):
        score = max(score, 80)
    elif suspicious_count >= 3 and (has_urgency or has_authority or has_link or has_shortened_url):
        score = max(score, 55)

    # --- Final verdict ---
    if score >= 80:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"

    # AI fallback only when score is genuinely low
    if str(ai_risk_level or "").upper() in {"LOW", "MEDIUM", "HIGH"}:
        return str(ai_risk_level).upper()

    return "LOW"



def _confidence_from_signals(risk_level, signals, indicators=None):
    """
    Derive confidence score that is consistent with both:
    - the number and weight of detected signals
    - the actual magnitude of threat vector values (urgency, authority, financial, emotional)
    """
    signal_set = {str(item).strip().lower() for item in (signals or [])}
    signal_count = len(signal_set)
    high_signal_hits = len(signal_set.intersection({name.lower() for name in HIGH_RISK_SIGNALS}))
    ind = indicators or {}

    # Base from signal count
    if signal_count <= 0:
        base = 24
    elif signal_count == 1:
        base = 58 if high_signal_hits else 48
    elif signal_count == 2:
        base = 74 if high_signal_hits else 68
    else:
        base = min(95, 86 + min(9, (signal_count - 3) * 3))

    # Vector magnitude boost — use the highest single vector as an anchor
    max_vector = max(
        ind.get("urgency_level", 0),
        ind.get("authority_claim", 0),
        ind.get("emotional_pressure", 0),
        ind.get("financial_request", 0),
    )
    # Compound coverage from the full vector set should reinforce the score
    # instead of being dampened by a simple average.
    vector_total = (
        ind.get("urgency_level", 0) +
        ind.get("authority_claim", 0) +
        ind.get("emotional_pressure", 0) +
        ind.get("financial_request", 0)
    )
    active_vector_count = sum(1 for value in (
        ind.get("urgency_level", 0),
        ind.get("authority_claim", 0),
        ind.get("emotional_pressure", 0),
        ind.get("financial_request", 0),
    ) if value > 0)

    # Confidence should track the higher of base vs compound vector-derived score.
    vector_derived = int(max_vector + (vector_total * 0.25) + (active_vector_count * 6))
    confidence = max(base, vector_derived)

    # Hard clamp by risk level so verdict and score always agree
    if risk_level == "HIGH":
        confidence = max(confidence, 82)
        confidence = min(confidence, 98)
    elif risk_level == "MEDIUM":
        confidence = max(confidence, 55)
        confidence = min(confidence, 79)
    else:  # LOW
        confidence = min(confidence, 45)

    return confidence



def _build_detailed_explanation(risk_level, signals, indicators, message, ai_explanation=""):
    signal_list = _dedupe_list(signals)
    if signal_list:
        signal_phrase = ", ".join(signal_list[:-1]) + (f" and {signal_list[-1]}" if len(signal_list) > 1 else signal_list[0])
    else:
        signal_phrase = "no clear manipulation indicators"

    severity_text = {
        "HIGH": "This message shows multiple characteristics commonly associated with phishing, fraud, or social engineering.",
        "MEDIUM": "This message contains suspicious traits that warrant caution before any interaction.",
        "LOW": "This message does not currently show strong scam indicators, but it should still be treated carefully if context is missing.",
    }[risk_level]

    pressure_text = (
        f"The strongest indicators are urgency at {indicators['urgency_level']}%, authority claims at {indicators['authority_claim']}%, "
        f"emotional pressure at {indicators['emotional_pressure']}%, and financial request pressure at {indicators['financial_request']}%."
    )

    risk_text = {
        "HIGH": "A user who responds may expose credentials, follow a phishing link, or make an unauthorized payment.",
        "MEDIUM": "The primary risk is being manipulated into clicking, replying, or trusting a sender before verifying legitimacy.",
        "LOW": "The immediate risk appears limited, but any unexpected request for money, credentials, or links should still be verified independently.",
    }[risk_level]

    explanation = (
        f"{severity_text} The analysis detected {signal_phrase}. "
        f"{pressure_text} {risk_text}"
    )

    if ai_explanation and len(re.split(r"[.!?]+", ai_explanation.strip())) >= 3:
        return ai_explanation.strip()
    return explanation


def _build_safety_actions(signals, risk_level):
    signal_set = {str(item).strip().lower() for item in (signals or [])}
    actions = []

    if "phishing links" in signal_set or "credential harvesting" in signal_set:
        actions.extend([
            "Do not click suspicious links or enter passwords, OTPs, or verification codes.",
            "Verify the sender through the organization's official app, website, or published support number.",
            "Report the message as phishing and delete or block the sender after verification.",
        ])

    if "financial request" in signal_set:
        actions.extend([
            "Do not send money, gift cards, crypto, or bank details without independent verification.",
            "Contact the claimed organization directly using an official channel before making any payment.",
            "Preserve the message and block the sender if the request cannot be validated.",
        ])

    if "authority impersonation" in signal_set:
        actions.extend([
            "Treat claimed authority as unverified until confirmed through an official contact route.",
            "Do not rely on phone numbers, links, or instructions contained inside the message itself.",
        ])

    if "suspicious offers" in signal_set:
        actions.extend([
            "Ignore reward or prize claims until the offer is confirmed on the official website.",
        ])

    if not actions:
        if risk_level == "LOW":
            actions.extend([
                "No strong scam indicators were detected, but continue to verify unexpected requests independently.",
                "Avoid sharing passwords, OTPs, or payment details unless you initiated the conversation yourself.",
                "If the sender becomes urgent or asks for sensitive information, stop and re-check the message.",
            ])
        else:
            actions.extend([
                "Pause before responding and verify the sender independently.",
                "Avoid sharing credentials, codes, or money until legitimacy is confirmed.",
                "Report and block the sender if the message remains suspicious after verification.",
            ])

    deduped_actions = _dedupe_list(actions)
    generic_actions = [
        "Pause before responding and verify the sender through an official channel.",
        "Do not share credentials, codes, or payment details based only on the message.",
        "Report, block, or delete the message if verification fails.",
    ]

    for action in generic_actions:
        if len(deduped_actions) >= 3:
            break
        if action not in deduped_actions:
            deduped_actions.append(action)

    return deduped_actions[:3]


def _normalize_analysis(analysis, message):
    """
    Normalize Gemini output using CENTRALIZED threat vector generation.
    All modalities use generate_threat_vectors() for consistent threat scoring.
    """
    analysis = analysis if isinstance(analysis, dict) else {}

    ai_risk_level = str(analysis.get("risk_level", "")).upper()
    if ai_risk_level not in {"LOW", "MEDIUM", "HIGH"}:
        ai_risk_level = ""

    ai_signals = analysis.get("signals", [])
    if not isinstance(ai_signals, list):
        ai_signals = []
    ai_signals = [_normalize_signal_name(item) for item in ai_signals]

    derived_signals = _signals_from_message_cues(message)
    normalized_signals = _dedupe_list([*ai_signals, *derived_signals])

    # === USE CENTRALIZED THREAT VECTOR ENGINE ===
    # This is the single source of truth for all modalities
    centralized_vectors = generate_threat_vectors(message)
    
    indicators = {
        "urgency_level": max(_to_score(analysis.get("urgency_level"), 0), centralized_vectors["urgency_level"]),
        "authority_claim": max(_to_score(analysis.get("authority_claim"), 0), centralized_vectors["authority_claim"]),
        "emotional_pressure": max(_to_score(analysis.get("emotional_pressure"), 0), centralized_vectors["emotional_pressure"]),
        "financial_request": max(_to_score(analysis.get("financial_request"), 0), centralized_vectors["financial_request"]),
    }

    risk_level = _classify_risk(normalized_signals, message, indicators, ai_risk_level)
    derived_confidence = _confidence_from_signals(risk_level, normalized_signals, indicators)
    confidence_score = max(_to_score(analysis.get("confidence_score"), derived_confidence), derived_confidence)
    confidence_score = min(95, confidence_score)

    explanation = _build_detailed_explanation(
        risk_level,
        normalized_signals,
        indicators,
        message,
        str(analysis.get("explanation", "")).strip(),
    )

    safety_actions = analysis.get("safety_actions", [])
    if not isinstance(safety_actions, list):
        safety_actions = []
    safety_actions = _dedupe_list([str(item).strip() for item in safety_actions if str(item).strip()])
    if len(safety_actions) < 3:
        safety_actions = _build_safety_actions(normalized_signals, risk_level)

    color_by_risk = {"LOW": "blue", "MEDIUM": "yellow", "HIGH": "red"}

    threat_highlights = analysis.get("threat_highlights", [])
    if not isinstance(threat_highlights, list):
        threat_highlights = []
    verified_highlights = []
    message_lower = message.lower()
    for h in threat_highlights:
        if isinstance(h, dict) and "snippet" in h and ("explanation" in h or "reason" in h):
            snippet = str(h["snippet"]).strip()
            reason_text = str(h.get("explanation") or h.get("reason")).strip()
            
            # Trust Gemini's extraction as we enforce strictly in the prompt.
            # Only drop if it's completely empty.
            if snippet and len(snippet) > 3 and reason_text:
                verified_highlights.append({
                    "snippet": snippet,
                    "explanation": reason_text
                })

    if not verified_highlights:
        verified_highlights = _generate_highlights_from_patterns(message)

    return {
        "risk_level": risk_level,
        "risk_color": color_by_risk[risk_level],
        "confidence_score": confidence_score,
        "signals": normalized_signals,
        "threat_highlights": verified_highlights,
        "explanation": explanation,
        "urgency_level": indicators["urgency_level"],
        "authority_claim": indicators["authority_claim"],
        "emotional_pressure": indicators["emotional_pressure"],
        "financial_request": indicators["financial_request"],
        "safety_actions": safety_actions,
        "document_category": analysis.get("scam_type", "Suspicious Call"),
        "message_type": analysis.get("scam_type", "Suspicious Call"),
    }


def _fallback_analysis(message):
    """Simple heuristic fallback when Gemini is unavailable."""
    signals = _signals_from_message_cues(message)
    indicators = _heuristic_indicator_levels(message)
    risk_level = _classify_risk(signals, message, indicators)
    confidence_score = _confidence_from_signals(risk_level, signals, indicators)

    return {
        "risk_level": risk_level,
        "risk_color": {"LOW": "blue", "MEDIUM": "yellow", "HIGH": "red"}[risk_level],
        "confidence_score": confidence_score,
        "signals": signals,
        "threat_highlights": _generate_highlights_from_patterns(message),
        "explanation": _build_detailed_explanation(risk_level, signals, indicators, message),
        "urgency_level": indicators["urgency_level"],
        "authority_claim": indicators["authority_claim"],
        "emotional_pressure": indicators["emotional_pressure"],
        "financial_request": indicators["financial_request"],
        "safety_actions": _build_safety_actions(signals, risk_level),
        "document_category": "Suspicious Analysis",
        "message_type": "Suspicious Analysis",
    }


def _analyze_link(url: str) -> dict:
    """
    Analyze a single URL for phishing/malicious indicators.
    
    Returns: {"url": str, "risk": "low"|"medium"|"high", "reason": str}
    """
    if not url or not isinstance(url, str):
        return {"url": url or "", "risk": "low", "reason": "Invalid URL"}
    
    lowered = url.lower()
    
    # Shortened URL services (high suspicion) - check for domain match only
    shorteners = [
        "bit.ly", "t.co", "tinyurl", "is.gd", "ow.ly", 
        "cutt.ly", "buff.ly", "adf.ly", "goo.gl", "short.link"
    ]
    # Use regex to match shortener as a domain, not substring
    shortener_pattern = r"(?:https?://)?(?:www\.)?(" + "|".join(re.escape(s) for s in shorteners) + r")(?:/|$)"
    if re.search(shortener_pattern, lowered):
        return {"url": url, "risk": "medium", "reason": "Shortened URL may hide destination"}
    
    # Suspicious TLDs commonly used in phishing
    sus_tlds = [".tk", ".xyz", ".top", ".ml", ".ga", ".cf", ".gq", ".info", ".download"]
    if any(lowered.endswith(tld) or (tld + "/") in lowered for tld in sus_tlds):
        return {"url": url, "risk": "high", "reason": "Suspicious TLD commonly used in phishing"}
    
    # Impersonation check: brand name present but wrong domain
    brands = [
        "microsoft", "google", "apple", "amazon", "paypal", 
        "facebook", "instagram", "whatsapp", "linkedin", "netflix"
    ]
    for brand in brands:
        if brand in lowered:
            # Check if it's NOT the official domain
            official_domains = [f"{brand}.com", f"{brand}.org", f"{brand}.net"]
            is_official = any(official in lowered for official in official_domains)
            if not is_official:
                return {"url": url, "risk": "high", "reason": f"Suspicious impersonation domain (contains '{brand}' but not official domain)"}
    
    # Phishing indicators in path/subdomain
    phishing_patterns = ["login-", "verify-", "secure-", "update-", "account-", "confirm-", "auth-"]
    if any(pattern in lowered for pattern in phishing_patterns):
        return {"url": url, "risk": "high", "reason": "URL structure suggests phishing (contains suspicious keywords)"}
    
    # Generic suspicious patterns
    if re.search(r"\/(?:login|signin|verify|confirm|update|auth|account)\b", lowered):
        return {"url": url, "risk": "high", "reason": "Possible phishing link"}
    
    # No indicators found
    return {"url": url, "risk": "low", "reason": "Appears safe"}