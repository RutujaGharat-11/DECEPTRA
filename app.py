import json
import os
import re
import sqlite3
import uuid
import tempfile

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from backend.gemini_engine import (
    GEMINI_API_KEY,
    MODEL_NAME,
    _analyze_normalized_text,
    _detect_language,
    _translate_analysis_for_ui,
    _translate_back,
    _translate_to_english,
    model,
)
from backend.pipelines.voice_pipeline import process_voice_pipeline
from backend.threat_engine import (
    HIGH_RISK_SIGNALS,
    SIGNAL_PATTERNS,
    _build_detailed_explanation,
    _build_safety_actions,
    _classify_risk,
    _confidence_from_signals,
    _contains_any,
    _count_keyword_hits,
    _dedupe_list,
    _extract_json,
    _fallback_analysis,
    _heuristic_indicator_levels,
    _normalize_analysis,
    _normalize_signal_name,
    _signals_from_message_cues,
    _to_score,
)

try:
    from langdetect import DetectorFactory, LangDetectException, detect_langs

    DetectorFactory.seed = 42
except ImportError:  # pragma: no cover - dependency is declared in requirements.txt
    DetectorFactory = None
    LangDetectException = Exception
    detect_langs = None

load_dotenv()

app = Flask(__name__)

import logging

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
app.logger.setLevel(logging.INFO)

# Limit upload size to 20 MB to prevent Railway worker OOM crashes
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024

_startup_port = int(os.environ.get("PORT", 5000))
app.logger.info(f"Starting up backend on port {_startup_port}...")
if os.getenv("GEMINI_API_KEY"):
    app.logger.info("GEMINI_API_KEY loaded successfully")
else:
    app.logger.error("GEMINI_API_KEY is missing!")

if os.getenv("DEEPGRAM_API_KEY"):
    app.logger.info("DEEPGRAM_API_KEY loaded successfully")
else:
    app.logger.error("DEEPGRAM_API_KEY is missing!")

# Strict Production-Safe CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "https://deceptra.vercel.app"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

@app.before_request
def log_request_info():
    if request.path.startswith("/analyze") and request.method != "OPTIONS":
        app.logger.info(f"Incoming request: {request.method} {request.path}")

@app.after_request
def after_request(response):
    # Using .set() instead of .add() to ensure we don't duplicate headers if flask-cors also adds them, which would break the browser.
    response.headers.set("Access-Control-Allow-Origin", request.headers.get("Origin", "*"))
    response.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    response.headers.set("Access-Control-Allow-Credentials", "true")
    return response

@app.errorhandler(Exception)
def handle_global_error(e):
    app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    # Ensure errors are serialized as JSON and always return a 500 (or the exception's code)
    # to prevent Flask from sending HTML error pages which trigger CORS errors in the browser.
    code = 500
    if hasattr(e, 'code'):
        code = e.code
    return jsonify({"error": "Internal Server Error", "details": str(e)}), code


DB_PATH = os.path.join(os.path.dirname(__file__), "auth.db")
DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
HINDI_HINTS = {
    "आप",
    "आपका",
    "आपकी",
    "है",
    "हैं",
    "नहीं",
    "कृपया",
    "करें",
    "करो",
    "तुरंत",
    "खाता",
    "संदेश",
    "लिंक",
    "ओटीपी",
    "पासवर्ड",
    "पैसे",
}
MARATHI_HINTS = {
    "तुम्ही",
    "तुमचा",
    "तुमची",
    "आहे",
    "आहेत",
    "नाही",
    "कृपया",
    "करा",
    "करू",
    "तात्काळ",
    "खाते",
    "संदेश",
    "दुवा",
    "ओटीपी",
    "पासवर्ड",
    "पैसे",
    "बँक",
}
HINGLISH_HINTS = {
    "hai",
    "nahi",
    "kripya",
    "jaldi",
    "turant",
    "otp",
    "password",
    "bhejo",
    "mat",
    "paisa",
    "paise",
    "account",
}
HINDI_ROMAN_HINTS = {
    "aap",
    "aapka",
    "aapki",
    "hai",
    "hain",
    "nahi",
    "kripya",
    "jaldi",
    "turant",
    "abhi",
    "karo",
    "kijiye",
    "bhejo",
    "band",
    "khata",
    "account",
    "link",
    "click",
    "otp",
    "password",
    "paise",
    "rupaye",
    "verify",
}
MARATHI_ROMAN_HINTS = {
    "tumhi",
    "tumcha",
    "tumchi",
    "ahe",
    "ahet",
    "nahi",
    "krupaya",
    "kripaya",
    "tatkal",
    "tatkaal",
    "lagel",
    "karा",
    "kara",
    "kara",
    "bandh",
    "khate",
    "khata",
    "link",
    "click",
    "otp",
    "password",
    "paise",
    "rupaye",
    "bank",
}


def _get_db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message_text TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            risk_color TEXT NOT NULL,
            confidence_score INTEGER NOT NULL,
            signals_json TEXT NOT NULL,
            explanation TEXT NOT NULL,
            urgency_level INTEGER NOT NULL,
            authority_claim INTEGER NOT NULL,
            emotional_pressure INTEGER NOT NULL,
            financial_request INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            critical_alerts INTEGER NOT NULL DEFAULT 1,
            weekly_summary INTEGER NOT NULL DEFAULT 0,
            risk_threshold INTEGER NOT NULL DEFAULT 75,
            educational_tips INTEGER NOT NULL DEFAULT 1,
            auto_archive_days INTEGER NOT NULL DEFAULT 30,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    conn.commit()
    conn.close()


def _extract_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return ""


def _session_user(token):
    if not token:
        return None
    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT u.id, u.full_name, u.email
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        """,
        (token,),
    )
    user = cur.fetchone()
    conn.close()
    return user


def _save_history_record(user_id, message_text, analysis):
    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO analysis_history (
            user_id,
            message_text,
            risk_level,
            risk_color,
            confidence_score,
            signals_json,
            explanation,
            urgency_level,
            authority_claim,
            emotional_pressure,
            financial_request
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            message_text,
            analysis.get("risk_level", "LOW"),
            analysis.get("risk_color", "blue"),
            int(analysis.get("confidence_score", 0)),
            json.dumps(analysis.get("signals", [])),
            analysis.get("explanation", ""),
            int(analysis.get("urgency_level", 0)),
            int(analysis.get("authority_claim", 0)),
            int(analysis.get("emotional_pressure", 0)),
            int(analysis.get("financial_request", 0)),
        ),
    )
    conn.commit()
    conn.close()


def _history_row_to_dict(row):
    signals = json.loads(row["signals_json"] or "[]")
    risk_level = row["risk_level"]
    return {
        "id": row["id"],
        "message_text": row["message_text"],
        "risk_level": risk_level,
        "risk_color": row["risk_color"],
        "confidence_score": row["confidence_score"],
        "signals": signals,
        "explanation": row["explanation"],
        "urgency_level": row["urgency_level"],
        "authority_claim": row["authority_claim"],
        "emotional_pressure": row["emotional_pressure"],
        "financial_request": row["financial_request"],
        "safety_actions": _build_safety_actions(signals, risk_level),
        "timestamp": row["created_at"],
        "source_type": "Scanner / User Input",
    }


def _settings_row_to_dict(row):
    return {
        "critical_alerts": bool(row["critical_alerts"]),
        "weekly_summary": bool(row["weekly_summary"]),
        "risk_threshold": int(row["risk_threshold"]),
        "educational_tips": bool(row["educational_tips"]),
        "auto_archive_days": int(row["auto_archive_days"]),
    }


def _default_settings_dict():
    return {
        "critical_alerts": True,
        "weekly_summary": False,
        "risk_threshold": 75,
        "educational_tips": True,
        "auto_archive_days": 30,
    }


def _is_supported_audio_filename(filename):
    if not filename:
        return False
    return os.path.splitext(filename)[1].lower() in {".mp3", ".wav", ".m4a"}


def _contains_devanagari(text):
    return bool(DEVANAGARI_RE.search(text or ""))


def _contains_latin(text):
    return bool(re.search(r"[A-Za-z]", text or ""))


def _language_hints_score(text, hints):
    tokens = re.findall(r"[\w\u0900-\u097F']+", (text or "").lower())
    return sum(1 for token in tokens if token in hints)


def _romanized_hints_score(text, hints):
    tokens = re.findall(r"[a-z']+", (text or "").lower())
    return sum(1 for token in tokens if token in hints)


def _looks_hinglish(text):
    lowered = (text or "").lower()
    if not _contains_latin(lowered):
        return False
    tokens = re.findall(r"[a-z']+", lowered)
    if not tokens:
        return False
    hint_hits = sum(1 for token in tokens if token in HINGLISH_HINTS)
    hindi_hits = _romanized_hints_score(lowered, HINDI_ROMAN_HINTS)
    marathi_hits = _romanized_hints_score(lowered, MARATHI_ROMAN_HINTS)
    return hint_hits >= 2 or hindi_hits >= 2 or marathi_hits >= 2


def _get_risk_findings(analysis):
    """Map numerical vectors to human-friendly findings."""
    findings = []
    
    # Urgency mapping
    urgency = analysis.get("urgency_level", 0)
    if urgency >= 60:
        findings.append("Encourages immediate urgency or action")
    elif urgency >= 30:
        findings.append("Uses moderate time-pressure tactics")
        
    # Authority mapping
    authority = analysis.get("authority_claim", 0)
    if authority >= 60:
        findings.append("Uses official authority branding to build trust")
    elif authority >= 30:
        findings.append("Claims association with official entities")
        
    # Emotional mapping
    emotional = analysis.get("emotional_pressure", 0)
    if emotional >= 60:
        findings.append("Uses heavy emotional manipulation or pressure")
    elif emotional >= 30:
        findings.append("Uses subtle emotional persuasion language")
        
    # Financial mapping
    financial = analysis.get("financial_request", 0)
    if financial >= 60:
        findings.append("Directly requests financial or sensitive data")
    elif financial >= 30:
        findings.append("Requests interaction with financial themes")
        
    # Signal-based findings
    signals = [str(s).lower() for s in analysis.get("signals", [])]
    if any("link" in s or "url" in s for s in signals):
        findings.append("Contains external registration or login links")
    if any("promo" in s or "offer" in s or "prize" in s for s in signals):
        findings.append("Uses promotional persuasion language")
        
    return findings


def _detect_source_heuristics(text):
    """Lightweight platform detection from OCR/Text keywords."""
    if not text:
        return "Generic Document"
    
    lowered = text.lower()
    
    if "whatsapp" in lowered or "forwarded" in lowered:
        return "WhatsApp Chat Screenshot"
    if "gmail" in lowered or "subject:" in lowered or "from:" in lowered:
        return "Gmail Email Screenshot"
    if "linkedin" in lowered or "connection" in lowered:
        return "LinkedIn Promotional Poster"
    if "telegram" in lowered or "t.me" in lowered:
        return "Telegram Message Screenshot"
    if "instagram" in lowered or "dm" in lowered:
        return "Instagram DM Screenshot"
    if "poster" in lowered or "event" in lowered or "join" in lowered:
        return "Generic Promotional Poster"
    
    return "Generic Source"


def _language_label(code):
    if code == "hi":
        return "Hindi"
    if code == "mr":
        return "Marathi"
    return "English"


def _detect_input_language(text):
    cleaned = (text or "").strip()
    if not cleaned:
        return {"code": "en", "label": "English", "confidence": 1.0}

    devanagari_present = _contains_devanagari(cleaned)
    latin_present = _contains_latin(cleaned)
    detected_code = "en"
    confidence = 0.0

    if devanagari_present and latin_present:
        return {"code": "hi", "label": "Hindi", "confidence": max(confidence, 0.6)}

    if devanagari_present:
        hindi_score = _language_hints_score(cleaned, HINDI_HINTS)
        marathi_score = _language_hints_score(cleaned, MARATHI_HINTS)
        if marathi_score > hindi_score:
            return {"code": "mr", "label": "Marathi", "confidence": max(confidence, 0.5)}
        return {"code": "hi", "label": "Hindi", "confidence": max(confidence, 0.5)}

    if latin_present:
        hindi_score = _romanized_hints_score(cleaned, HINDI_ROMAN_HINTS) + _language_hints_score(cleaned, HINGLISH_HINTS)
        marathi_score = _romanized_hints_score(cleaned, MARATHI_ROMAN_HINTS)
        if max(hindi_score, marathi_score) >= 2:
            if marathi_score > hindi_score:
                return {"code": "mr", "label": "Marathi", "confidence": 0.65}
            return {"code": "hi", "label": "Hindi", "confidence": 0.65}

    if detect_langs is not None:
        try:
            candidates = detect_langs(cleaned)
            if candidates:
                top_candidate = candidates[0]
                detected_code = top_candidate.lang
                confidence = float(top_candidate.prob)
        except LangDetectException:
            detected_code = "en"
            confidence = 0.0
        except Exception:
            detected_code = "en"
            confidence = 0.0

    if detected_code == "en" and _looks_hinglish(cleaned):
        return {"code": "hi", "label": "Hindi", "confidence": max(confidence, 0.55)}

    if detected_code in {"hi", "mr"}:
        if latin_present:
            return {"code": "hi", "label": "Hindi", "confidence": max(confidence, 0.6)}
        hindi_score = _language_hints_score(cleaned, HINDI_HINTS)
        marathi_score = _language_hints_score(cleaned, MARATHI_HINTS)
        if marathi_score > hindi_score:
            detected_code = "mr"
        elif hindi_score > marathi_score:
            detected_code = "hi"
        return {"code": detected_code, "label": _language_label(detected_code), "confidence": confidence}

    return {"code": "en", "label": "English", "confidence": confidence or 1.0}



_init_db()


@app.route("/")
def home():
    return {"message": "Deception Risk Scanner Backend Running"}


@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not full_name or not email or not password or not confirm_password:
        return jsonify({"error": "All fields are required"}), 400
    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn = _get_db_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
            (full_name, email, generate_password_hash(password)),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Email already exists"}), 409

    conn.close()
    return jsonify({"message": "Account created successfully"}), 201


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, full_name, email, password_hash FROM users WHERE email = ?", (email,))
    user = cur.fetchone()

    if not user or not check_password_hash(user["password_hash"], password):
        conn.close()
        return jsonify({"error": "Invalid email or password"}), 401

    token = uuid.uuid4().hex
    cur.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user["id"]))
    conn.commit()
    conn.close()

    return jsonify(
        {
            "token": token,
            "user": {
                "full_name": user["full_name"],
                "email": user["email"],
            },
        }
    )


@app.route("/auth/me", methods=["GET"])
def me():
    token = _extract_bearer_token()
    user = _session_user(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    return jsonify({"full_name": user["full_name"], "email": user["email"]})


@app.route("/auth/logout", methods=["POST"])
def logout():
    token = _extract_bearer_token()
    if token:
        conn = _get_db_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()

    return jsonify({"message": "Signed out"})


@app.route("/api/history", methods=["GET"])
def history_list():
    token = _extract_bearer_token()
    user = _session_user(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT *
        FROM analysis_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (user["id"],),
    )
    rows = cur.fetchall()
    conn.close()

    return jsonify([_history_row_to_dict(row) for row in rows])


@app.route("/api/history", methods=["DELETE"])
def history_clear():
    token = _extract_bearer_token()
    user = _session_user(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM analysis_history WHERE user_id = ?", (user["id"],))
    deleted_count = cur.rowcount or 0
    conn.commit()
    conn.close()

    return jsonify({"message": "History cleared", "deleted_count": int(deleted_count)}), 200


@app.route("/api/history/<int:record_id>", methods=["GET"])
def history_detail(record_id):
    token = _extract_bearer_token()
    user = _session_user(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT *
        FROM analysis_history
        WHERE id = ? AND user_id = ?
        """,
        (record_id, user["id"]),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Not found"}), 404

    return jsonify(_history_row_to_dict(row))


@app.route("/api/reports/history", methods=["GET"])
def reports_history():
    return history_list()


@app.route("/api/reports/overview", methods=["GET"])
def reports_overview():
    token = _extract_bearer_token()
    user = _session_user(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            COUNT(*) AS total_scanned,
            SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) AS high_risk_count,
            SUM(CASE WHEN risk_level = 'MEDIUM' THEN 1 ELSE 0 END) AS medium_risk_count,
            SUM(CASE WHEN risk_level = 'LOW' THEN 1 ELSE 0 END) AS low_risk_count,
            AVG(confidence_score) AS avg_confidence
        FROM analysis_history
        WHERE user_id = ?
        """,
        (user["id"],),
    )
    row = cur.fetchone()

    cur.execute(
        """
        SELECT DATE(created_at) AS day_key, COUNT(*) AS count_value
        FROM analysis_history
        WHERE user_id = ?
        GROUP BY DATE(created_at)
        ORDER BY day_key DESC
        LIMIT 7
        """,
        (user["id"],),
    )
    weekly_rows = cur.fetchall()
    conn.close()

    total_scanned = int(row["total_scanned"] or 0)
    high_risk_count = int(row["high_risk_count"] or 0)
    medium_risk_count = int(row["medium_risk_count"] or 0)
    low_risk_count = int(row["low_risk_count"] or 0)
    avg_confidence = int(round(float(row["avg_confidence"] or 0)))

    distribution = {
        "high": int(round((high_risk_count / total_scanned) * 100)) if total_scanned else 0,
        "medium": int(round((medium_risk_count / total_scanned) * 100)) if total_scanned else 0,
        "low": int(round((low_risk_count / total_scanned) * 100)) if total_scanned else 0,
    }

    weekly = list(reversed([
        {"day": row_item["day_key"], "count": int(row_item["count_value"] or 0)}
        for row_item in weekly_rows
    ]))

    return jsonify(
        {
            "total_scanned": total_scanned,
            "high_risk_count": high_risk_count,
            "medium_risk_count": medium_risk_count,
            "low_risk_count": low_risk_count,
            "avg_confidence": avg_confidence,
            "distribution": distribution,
            "weekly": weekly,
        }
    )


@app.route("/api/reports/anomalies", methods=["GET"])
def reports_anomalies():
    token = _extract_bearer_token()
    user = _session_user(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT *
        FROM analysis_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 100
        """,
        (user["id"],),
    )
    rows = cur.fetchall()
    conn.close()

    anomalies = []

    high_risk_recent = [row for row in rows if row["risk_level"] == "HIGH"]
    if len(high_risk_recent) >= 3:
        anomalies.append(
            {
                "title": "Multiple High-Risk Detections",
                "description": f"{len(high_risk_recent)} high-risk messages detected recently.",
                "severity": "high",
                "time": "recent",
            }
        )

    extreme_rows = [
        row
        for row in rows
        if int(row["urgency_level"] or 0) >= 90 or int(row["financial_request"] or 0) >= 90
    ]
    if extreme_rows:
        anomalies.append(
            {
                "title": "Extreme Manipulation Scores",
                "description": f"{len(extreme_rows)} messages with very high urgency/financial indicators.",
                "severity": "medium",
                "time": "recent",
            }
        )

    signal_counts = {}
    for row in rows:
        for signal in json.loads(row["signals_json"] or "[]"):
            signal_name = str(signal)
            signal_counts[signal_name] = signal_counts.get(signal_name, 0) + 1

    repeated = [name for name, count in signal_counts.items() if count >= 3]
    if repeated:
        anomalies.append(
            {
                "title": "Repeated Manipulation Signals",
                "description": "Recurring signals: " + ", ".join(repeated[:3]) + ".",
                "severity": "medium",
                "time": "recent",
            }
        )

    return jsonify(anomalies)


@app.route("/api/settings", methods=["GET"])
def get_settings():
    token = _extract_bearer_token()
    user = _session_user(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM user_settings WHERE user_id = ?", (user["id"],))
    row = cur.fetchone()

    if not row:
        defaults = _default_settings_dict()
        cur.execute(
            """
            INSERT INTO user_settings (
                user_id,
                critical_alerts,
                weekly_summary,
                risk_threshold,
                educational_tips,
                auto_archive_days
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                int(defaults["critical_alerts"]),
                int(defaults["weekly_summary"]),
                defaults["risk_threshold"],
                int(defaults["educational_tips"]),
                defaults["auto_archive_days"],
            ),
        )
        conn.commit()
        conn.close()
        return jsonify(defaults)

    settings_data = _settings_row_to_dict(row)
    conn.close()
    return jsonify(settings_data)


@app.route("/api/settings", methods=["PUT"])
def update_settings():
    token = _extract_bearer_token()
    user = _session_user(token)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}

    critical_alerts = bool(data.get("critical_alerts", True))
    weekly_summary = bool(data.get("weekly_summary", False))
    educational_tips = bool(data.get("educational_tips", True))

    try:
        risk_threshold = int(data.get("risk_threshold", 75))
    except (TypeError, ValueError):
        risk_threshold = 75
    risk_threshold = max(0, min(100, risk_threshold))

    try:
        auto_archive_days = int(data.get("auto_archive_days", 30))
    except (TypeError, ValueError):
        auto_archive_days = 30
    if auto_archive_days not in {0, 7, 30, 90}:
        auto_archive_days = 30

    conn = _get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO user_settings (
            user_id,
            critical_alerts,
            weekly_summary,
            risk_threshold,
            educational_tips,
            auto_archive_days,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            critical_alerts = excluded.critical_alerts,
            weekly_summary = excluded.weekly_summary,
            risk_threshold = excluded.risk_threshold,
            educational_tips = excluded.educational_tips,
            auto_archive_days = excluded.auto_archive_days,
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            user["id"],
            int(critical_alerts),
            int(weekly_summary),
            risk_threshold,
            int(educational_tips),
            auto_archive_days,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify(
        {
            "critical_alerts": critical_alerts,
            "weekly_summary": weekly_summary,
            "risk_threshold": risk_threshold,
            "educational_tips": educational_tips,
            "auto_archive_days": auto_archive_days,
        }
    )


@app.route("/analyze", methods=["POST", "OPTIONS"])
def analyze():
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    try:
        token = _extract_bearer_token()
        user = None
        if token and token not in ["null", "undefined"]:
            user = _session_user(token)
            if not user:
                app.logger.warning(f"Invalid token '{token}' provided, proceeding as anonymous user.")
                # We do NOT return 401 here to allow public scans to continue seamlessly.

        data = request.get_json(silent=True) or {}
        original_text = (data.get("message") or data.get("text") or "").strip()

        if not original_text:
            return jsonify({"error": "Message is required"}), 400

        #  LANGUAGE DETECTION
        message = original_text
        detected = _detect_input_language(message)
        detected_language = detected["label"]
        detected_language_key = detected_language.lower()
        
        translated = False
        original_message = message

        if detected_language_key != "english":
            message = _translate_to_english(message, detected["label"])
            translated = True

        translated_to_english = translated
        normalized_text = message

        if not normalized_text:
            normalized_text = original_message

        if model is None:
            analysis = _fallback_analysis(original_message)
            analysis["detected_language"] = detected_language
            analysis["translated_to_english"] = translated
        else:
            analysis = _analyze_normalized_text(normalized_text)

        print("Parsed JSON successfully")

        #  Translate output back if needed
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

        # Add metadata
        analysis["detected_language"] = detected_language
        analysis["translated_to_english"] = translated
        
        # Add modality awareness and findings
        modality = data.get("modality", "text")
        analysis["modality"] = modality
        analysis["risk_findings"] = _get_risk_findings(analysis)
        
        if modality == "image":
            analysis["detected_source"] = _detect_source_heuristics(original_message)
        elif modality == "document":
            analysis["detected_source"] = "Uploaded Document"

        app.logger.info(f"Gemini response generated successfully for {modality} analysis.")

        if user:
            _save_history_record(user["id"], original_message, analysis)

        return jsonify(analysis), 200
    except json.JSONDecodeError:
        app.logger.exception("Gemini response JSON parsing failed; using fallback analysis")
        data = request.get_json(silent=True) or {}
        original_text = (data.get("message") or data.get("text") or "").strip()
        
        token = _extract_bearer_token()
        user = None
        if token and token not in ["null", "undefined"]:
            user = _session_user(token)
            if not user:
                app.logger.warning(f"Invalid token '{token}' provided during fallback, proceeding as anonymous.")
        detected = _detect_input_language(original_text)
        translated_to_english = detected["label"] != "English"
        normalized_text = _translate_to_english(original_text, detected["label"])
        analysis = _fallback_analysis(normalized_text or original_text)
        localized_analysis = _translate_analysis_for_ui(analysis, detected["label"])
        if user:
            _save_history_record(user["id"], original_text, analysis)
        response_payload = {
            "detected_language": detected["label"],
            "translated_to_english": translated_to_english,
            "normalized_text": normalized_text or original_text,
            "original_text": original_text,
            "translated_text": normalized_text or original_text,
            "analysis": localized_analysis,
            "threat_highlights": localized_analysis.get("threat_highlights", []),
        }
        response_payload.update(localized_analysis)
        return jsonify(response_payload), 200
    except Exception as exc:
        details = str(exc)
        app.logger.exception(f"Internal exception during analysis: {details}")
        return jsonify({"error": "Internal Server Error", "details": details}), 500


@app.route("/analyze/voice", methods=["POST", "OPTIONS"])
@app.route("/analyze/audio", methods=["POST", "OPTIONS"])
def analyze_voice():
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    token = _extract_bearer_token()
    user = None
    if token and token not in ["null", "undefined"]:
        user = _session_user(token)
        if not user:
            app.logger.warning(f"Invalid token '{token}' provided for audio, proceeding as anonymous.")

    uploaded_file = request.files.get("file") or request.files.get("audio")
    if not uploaded_file or uploaded_file.filename == "":
        return jsonify({"error": "Audio file is required"}), 400

    if not _is_supported_audio_filename(uploaded_file.filename):
        return jsonify({"error": "Unsupported audio format. Please upload mp3, wav, or m4a."}), 400

    temp_path = ""
    try:
        _, extension = os.path.splitext(uploaded_file.filename)
        suffix = extension.lower() if extension else ".audio"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            uploaded_file.save(temp_file)
            temp_path = temp_file.name

        voice_result = process_voice_pipeline(temp_path)
        analysis = voice_result.get("analysis") or {}
        if not isinstance(analysis, dict):
            analysis = {}

        transcript = (voice_result.get("transcript") or "").strip()
        detected_language = analysis.get("detected_language") or voice_result.get("language") or "Unknown"

        response_payload = dict(analysis)
        response_payload.update(
            {
                "success": bool(voice_result.get("success", False)),
                "transcript": transcript,
                "language": voice_result.get("language", "Unknown"),
                "detected_language": detected_language,
                "translated_to_english": bool(analysis.get("translated_to_english", False)),
                "risk_score": response_payload.get("confidence_score", 0),
                "modality": "audio",
                "risk_findings": _get_risk_findings(analysis),
                "analysis": analysis,
                "source_type": "Voice / Audio Upload",
            }
        )

        if user:
            _save_history_record(user["id"], transcript or uploaded_file.filename, response_payload)
            
        app.logger.info(f"Voice analysis completed successfully. Transcript length: {len(transcript)}")
        return jsonify(response_payload), 200
    except Exception as exc:
        app.logger.exception(f"Internal exception during voice analysis: {str(exc)}")
        return jsonify({"error": "Voice analysis failed", "details": str(exc)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.logger.info(f"Flask dev server starting on 0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port)