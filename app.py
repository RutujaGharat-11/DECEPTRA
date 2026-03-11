import json
import os
import re
import sqlite3
import uuid

import google.generativeai as genai
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").strip()
if CORS_ORIGINS == "*":
    CORS(app)
else:
    allowed_origins = [origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()]
    CORS(app, resources={r"/*": {"origins": allowed_origins}})

DB_PATH = os.path.join(os.path.dirname(__file__), "auth.db")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Keep app startup resilient; return a clear error from /analyze if missing.
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash") if GEMINI_API_KEY else None
MODEL_NAME = "gemini-1.5-flash"


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
    ],
    "Phishing Links": [
        "http://",
        "https://",
        "www.",
        "bit.ly",
        "tinyurl",
        "click the link",
        "click here",
        "verify here",
        "login here",
        "open this link",
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


def _heuristic_indicator_levels(message):
    """Compute indicator strengths from message content when AI values are missing or weak."""
    lowered = (message or "").lower()

    urgency_hits = _count_keyword_hits(lowered, SIGNAL_PATTERNS["Urgency Pressure"])
    authority_hits = _count_keyword_hits(lowered, SIGNAL_PATTERNS["Authority Impersonation"] + SIGNAL_PATTERNS["Account Security Threats"])
    emotional_hits = _count_keyword_hits(lowered, SIGNAL_PATTERNS["Emotional Manipulation"])
    financial_hits = _count_keyword_hits(lowered, SIGNAL_PATTERNS["Financial Request"])

    if re.search(r"\b\d+\s*(minutes?|hours?)\b", lowered):
        urgency_hits += 1
    if "!" in lowered:
        urgency_hits += min(2, lowered.count("!"))

    def score_from_hits(hits, base, per_hit):
        if hits <= 0:
            return 0
        return min(100, base + hits * per_hit)

    return {
        "urgency_level": score_from_hits(urgency_hits, 35, 16),
        "authority_claim": score_from_hits(authority_hits, 30, 18),
        "emotional_pressure": score_from_hits(emotional_hits, 28, 16),
        "financial_request": score_from_hits(financial_hits, 35, 18),
    }


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
    """Determine final risk based on threat factors and enforce high-risk conditions."""
    signal_set = {str(item).strip().lower() for item in (signals or [])}
    lowered = (message or "").lower()

    has_money_request = "financial request" in signal_set or _contains_any(lowered, SIGNAL_PATTERNS["Financial Request"])
    has_authority = "authority impersonation" in signal_set or _contains_any(lowered, SIGNAL_PATTERNS["Authority Impersonation"])
    has_link = "phishing links" in signal_set or re.search(r"(?:https?://|www\.|bit\.ly|tinyurl)", lowered)
    has_credentials = "credential harvesting" in signal_set or _contains_any(lowered, SIGNAL_PATTERNS["Credential Harvesting"])
    has_offer = "suspicious offers" in signal_set or _contains_any(lowered, SIGNAL_PATTERNS["Suspicious Offers"])
    has_urgency = "urgency pressure" in signal_set or indicators.get("urgency_level", 0) >= 45

    if has_money_request or has_authority or has_link or has_credentials:
        return "HIGH"

    if has_offer or has_urgency or len(signal_set) >= 2:
        return "MEDIUM"

    if str(ai_risk_level or "").upper() in {"LOW", "MEDIUM", "HIGH"}:
        return str(ai_risk_level).upper()

    return "LOW"


def _confidence_from_signals(risk_level, signals):
    signal_set = {str(item).strip().lower() for item in (signals or [])}
    signal_count = len(signal_set)
    high_signal_hits = len(signal_set.intersection({name.lower() for name in HIGH_RISK_SIGNALS}))

    if signal_count <= 0:
        confidence = 24
    elif signal_count == 1:
        confidence = 58 if high_signal_hits else 48
    elif signal_count == 2:
        confidence = 74 if high_signal_hits else 68
    else:
        confidence = min(95, 86 + min(9, (signal_count - 3) * 3))

    if risk_level == "HIGH":
        confidence = max(confidence, 85 if high_signal_hits else 80)
    elif risk_level == "MEDIUM":
        confidence = min(max(confidence, 60), 79)
    else:
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
    """Normalize Gemini output into the exact response schema without falling back unless the request failed."""
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

    heuristic_indicators = _heuristic_indicator_levels(message)
    indicators = {
        "urgency_level": max(_to_score(analysis.get("urgency_level"), 0), heuristic_indicators["urgency_level"]),
        "authority_claim": max(_to_score(analysis.get("authority_claim"), 0), heuristic_indicators["authority_claim"]),
        "emotional_pressure": max(_to_score(analysis.get("emotional_pressure"), 0), heuristic_indicators["emotional_pressure"]),
        "financial_request": max(_to_score(analysis.get("financial_request"), 0), heuristic_indicators["financial_request"]),
    }

    risk_level = _classify_risk(normalized_signals, message, indicators, ai_risk_level)
    derived_confidence = _confidence_from_signals(risk_level, normalized_signals)
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

    return {
        "risk_level": risk_level,
        "risk_color": color_by_risk[risk_level],
        "confidence_score": confidence_score,
        "signals": normalized_signals,
        "explanation": explanation,
        "urgency_level": indicators["urgency_level"],
        "authority_claim": indicators["authority_claim"],
        "emotional_pressure": indicators["emotional_pressure"],
        "financial_request": indicators["financial_request"],
        "safety_actions": safety_actions,
    }


def _fallback_analysis(message):
    """Simple heuristic fallback when Gemini is unavailable."""
    signals = _signals_from_message_cues(message)
    indicators = _heuristic_indicator_levels(message)
    risk_level = _classify_risk(signals, message, indicators)
    confidence_score = _confidence_from_signals(risk_level, signals)

    return {
        "risk_level": risk_level,
        "risk_color": {"LOW": "blue", "MEDIUM": "yellow", "HIGH": "red"}[risk_level],
        "confidence_score": confidence_score,
        "signals": signals,
        "explanation": _build_detailed_explanation(risk_level, signals, indicators, message),
        "urgency_level": indicators["urgency_level"],
        "authority_claim": indicators["authority_claim"],
        "emotional_pressure": indicators["emotional_pressure"],
        "financial_request": indicators["financial_request"],
        "safety_actions": _build_safety_actions(signals, risk_level),
    }


@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        token = _extract_bearer_token()
        user = _session_user(token)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        data = request.get_json(silent=True) or {}
        message = (data.get("message") or "").strip()

        if not message:
            return jsonify({"error": "Message is required"}), 400

        if model is None:
            analysis = _fallback_analysis(message)
            _save_history_record(user["id"], message, analysis)
            return jsonify(analysis), 200

        prompt = f"""
    You are a cybersecurity threat detection assistant specializing in phishing, scams, business email compromise, credential theft, and social engineering.

    Analyze the message in a structured way before assigning a final risk level.

    Step 1: Evaluate the message for these threat factors:
    - urgency pressure: urgent, immediately, act now, limited time, final warning
    - authority impersonation: bank, government, IRS, company security team, fraud department, police, official support
    - financial request: fees, transfers, payment requests, gift cards, crypto, refunds, deposits, rewards requiring payment
    - credential harvesting: OTP, password, PIN, login request, account verification code
    - phishing links: suspicious URLs, shortened links, login or verification links
    - emotional manipulation: fear, panic, threats, account suspension, family emergency, pressure to comply
    - suspicious offers or rewards: prizes, winnings, bonuses, free gifts, exclusive rewards

    Step 2: Assign the final risk level using these rules:
    - HIGH if the message requests money, impersonates authority, contains a phishing link, or asks for OTPs or credentials
    - MEDIUM if the message contains suspicious offers, vague urgency, or reward scam characteristics without direct credential/payment theft indicators
    - LOW if it appears to be casual conversation with no manipulation indicators

    Step 3: Return STRICT JSON only. Do not include markdown, commentary, or any text outside the JSON object.

    The explanation must be 3 to 4 sentences and clearly describe:
    - which manipulation techniques were detected
    - why the message is suspicious
    - what risk it poses to the user

    The safety_actions array must contain exactly 3 short, context-specific recommendations.

    Message to analyze:
    {json.dumps(message)}

    Return exactly this JSON schema:
    {{
      "risk_level": "LOW | MEDIUM | HIGH",
      "risk_color": "blue | yellow | red",
      "confidence_score": 0,
      "signals": ["signal 1", "signal 2"],
      "explanation": "3-4 sentence explanation",
      "urgency_level": 0,
      "authority_claim": 0,
      "emotional_pressure": 0,
      "financial_request": 0,
      "safety_actions": ["action 1", "action 2", "action 3"]
    }}
    """

        print("Gemini request sent")
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        print("Gemini response received")

        raw_text = getattr(response, "text", "") or ""
        analysis = _normalize_analysis(_extract_json(raw_text), message)
        print("Parsed JSON successfully")

        _save_history_record(user["id"], message, analysis)

        return jsonify(analysis), 200
    except json.JSONDecodeError:
        raw_response = ""
        try:
            raw_response = getattr(locals().get("response"), "text", "") or ""
        except Exception:
            raw_response = ""
        print("Gemini raw response before fallback:")
        print(raw_response)
        app.logger.exception("Gemini response JSON parsing failed; using fallback analysis")
        data = request.get_json(silent=True) or {}
        message = (data.get("message") or "").strip()
        token = _extract_bearer_token()
        user = _session_user(token)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        analysis = _fallback_analysis(message)
        _save_history_record(user["id"], message, analysis)
        return jsonify(analysis), 200
    except Exception as exc:
        details = str(exc)
        print(f"Gemini API error: {details}")
        app.logger.exception("Gemini API request failed; using fallback analysis")
        data = request.get_json(silent=True) or {}
        message = (data.get("message") or "").strip()
        token = _extract_bearer_token()
        user = _session_user(token)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        analysis = _fallback_analysis(message)
        _save_history_record(user["id"], message, analysis)
        return jsonify(analysis), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
