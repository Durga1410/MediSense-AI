"""MediSense AI — deterministic preliminary assessment engine.

Transparent keyword/weight heuristics for a triage-style prototype. Nothing here is a
medical claim: outputs are "possible health category" / "risk level" and every result
carries guidance toward professional care. All thresholds are configurable.
"""

import re

LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

GUIDANCE = {
    "LOW": "Monitor your symptoms and consider a routine consultation with the recommended "
           "department if they persist beyond a few days or worsen.",
    "MEDIUM": "Consider scheduling a consultation with the recommended department within the "
              "next 24-48 hours. Rest, stay hydrated, and keep monitoring your symptoms.",
    "HIGH": "Seek prompt medical evaluation today - an urgent care visit or same-day "
            "consultation with the recommended department is advised.",
    "CRITICAL": "Seek immediate professional/emergency medical care. Contact your local "
                "emergency services right away - do not delay.",
}

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Cardiovascular": [
        "chest pain", "chest discomfort", "chest pressure", "crushing", "radiating to",
        "left arm", "jaw pain", "palpitations", "heart racing", "irregular heartbeat",
        "fluttering heart",
    ],
    "Respiratory": [
        "shortness of breath", "breathing difficulty", "difficulty breathing",
        "trouble breathing", "short of breath", "wheezing", "cough", "coughing",
        "chest tightness", "suffocating", "wheez", "breathless",
    ],
    "Gastrointestinal": [
        "nausea", "vomiting", "diarrhea", "stomach pain", "abdominal pain", "bloating",
        "heartburn", "acid reflux", "constipation", "indigestion", "blood in stool",
    ],
    "Neurological": [
        "headache", "migraine", "dizziness", "numbness", "tingling", "seizure",
        "slurred speech", "confusion", "vision loss", "blurred vision",
        "light sensitivity", "neck stiffness", "lightheaded",
    ],
    "Musculoskeletal": [
        "back pain", "joint pain", "muscle pain", "sprain", "fracture", "swollen joint",
        "knee pain", "shoulder pain", "limited mobility", "body aches",
    ],
    "Dermatological": [
        "rash", "itching", "hives", "mole", "acne", "blisters", "skin redness",
        "skin swelling",
    ],
    "ENT": [
        "sore throat", "ear pain", "earache", "hearing loss", "runny nose", "stuffy nose",
        "blocked nose", "sinus", "nasal", "swallowing difficulty", "ringing in ears",
        "tonsil",
    ],
    "General Medicine": [
        "fever", "fatigue", "weakness", "chills", "sweating", "weight loss", "malaise",
        "tiredness", "lethargy", "dehydration",
    ],
}

DEPARTMENT_BY_CATEGORY = {
    "Cardiovascular": "Cardiology",
    "Respiratory": "Pulmonology",
    "Gastrointestinal": "Gastroenterology",
    "Neurological": "Neurology",
    "Musculoskeletal": "Orthopedics",
    "Dermatological": "Dermatology",
    "ENT": "ENT",
    "General Medicine": "General Medicine",
}

# Patterns that should always escalate: immediate professional/emergency care advised.
EMERGENCY_PATTERNS = [
    "crushing chest", "chest pain radiating", "chest pressure radiating", "pain spreading to",
    "spreading to my", "severe difficulty breathing", "severe breathing difficulty",
    "can't breathe", "cannot breathe", "struggling to breathe", "gasping",
    "slurred speech", "face drooping", "one side of my body", "sudden confusion",
    "worst headache", "unconscious", "passed out", "fainted", "seizure",
    "severe bleeding", "coughing blood", "vomiting blood", "blood in vomit",
    "swelling of the lips", "swelling of the tongue", "throat closing", "suicidal",
]

# Urgent (but not always critical) symptoms that add weight.
RED_FLAG_SYMPTOMS = [
    "chest discomfort", "chest pain", "chest tightness", "difficulty breathing",
    "shortness of breath", "trouble breathing", "slurred speech", "blood in stool",
    "coughing blood", "vomiting blood", "high fever", "stiff neck", "vision loss",
]

CONDITION_KEYWORDS = {
    "diabetes": "Diabetes",
    "hypertension": "Hypertension",
    "blood pressure": "Hypertension",
    "asthma": "Asthma",
    "copd": "COPD",
    "heart disease": "Heart disease",
    "heart failure": "Heart disease",
    "cancer": "Cancer",
    "kidney": "Kidney disease",
    "stroke": "Prior stroke",
    "cholesterol": "High cholesterol",
    "thyroid": "Thyroid disorder",
    "anemia": "Anemia",
    "smoking": "Smoker",
    "smoker": "Smoker",
}

GREETING = "Hi, I'm MediSense AI. What symptoms are you experiencing?"

# Deterministic conversation script used when the LLM is unavailable (and for the very
# first scripted question when AI is offline). One question at a time, triage-nurse style.
SCRIPTED_REPLIES = [
    "Thanks for sharing. How long have you been experiencing these symptoms?",
    "How severe would you rate the discomfort - mild, moderate, or severe?",
    "Did the symptoms start suddenly, or did they come on gradually?",
    "Could you share your age and gender? This helps calibrate the preliminary assessment.",
    "Do you have any existing medical conditions (such as diabetes or hypertension) or "
    "medications you currently take?",
    "Thank you - I have enough information for a preliminary assessment. "
    'Select "Generate Preliminary Assessment" when you are ready.',
]

URGENT_REPLY = (
    "Your message describes symptoms that can sometimes indicate a medical emergency. "
    "Please contact your local emergency services or seek immediate medical care now. "
    "MediSense AI can still prepare a preliminary assessment for the clinicians who see you - "
    "select \"Generate Preliminary Assessment\" when you are ready."
)

DISCLAIMER = (
    "MediSense AI provides preliminary healthcare guidance and is not a replacement for a "
    "qualified medical professional. This is not a diagnosis. If you are experiencing a "
    "medical emergency, contact local emergency services or seek immediate medical care."
)


def detect_emergency(text: str) -> list[str]:
    """Return the emergency patterns present in `text` (lowercased)."""
    low = text.lower()
    return [p for p in EMERGENCY_PATTERNS if p in low]


def _severity_of(text: str) -> str:
    if re.search(r"severe|unbearable|worst|extreme|10 out of 10|9 out of 10", text):
        return "severe"
    if "moderate" in text:
        return "moderate"
    if re.search(r"\bmild\b", text):
        return "mild"
    return "unknown"


def _onset_of(text: str) -> str:
    if "sudden" in text or "out of nowhere" in text or "just started" in text:
        return "sudden"
    if "gradual" in text or "slowly" in text or "past few days" in text:
        return "gradual"
    return "unknown"


def _duration_of(text: str) -> str:
    m = re.search(r"(\d+)\s*(hour|day|week|month)s?", text)
    if m:
        n, unit = int(m.group(1)), m.group(2)
        return f"{n} {unit}{'s' if n != 1 else ''}"
    if "yesterday" in text:
        return "1 day"
    if "today" in text or "this morning" in text:
        return "a few hours"
    return "unknown"


def _age_of(text: str) -> int | None:
    m = re.search(r"(?:i am|i'm|age is|age:|aged)\s*(\d{1,3})\b", text) or re.search(
        r"\b(\d{1,3})\s*(?:years old|yrs|yo)\b", text
    )
    if m:
        val = int(m.group(1))
        if 0 < val < 120:
            return val
    return None


def _gender_of(text: str) -> str:
    if re.search(r"\bfemale\b|\bwoman\b", text):
        return "female"
    if re.search(r"\bmale\b|\bman\b", text):
        return "male"
    return "unknown"


def _conditions_of(text: str) -> list[str]:
    found = []
    for kw, label in CONDITION_KEYWORDS.items():
        if kw in text and label not in found:
            found.append(label)
    return found


def fallback_extract(messages: list[dict]) -> dict:
    """Rule-based extraction from a transcript — the always-works fallback."""
    user_text = " ".join(
        m.get("content", "") for m in messages if m.get("role") == "user"
    ).lower()

    buckets: dict[str, list[str]] = {}
    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if kw in user_text:
                buckets.setdefault(cat, []).append(kw)

    primary: list[str] = []
    secondary: list[str] = []
    red_flags = [s for s in RED_FLAG_SYMPTOMS if s in user_text]
    for cat, kws in buckets.items():
        for kw in kws:
            target = primary if kw in red_flags or len(primary) < 4 else secondary
            if kw not in primary and kw not in secondary:
                target.append(kw)

    emergency = detect_emergency(user_text)
    conditions = _conditions_of(user_text)
    risk_factors = list(conditions)
    age = _age_of(user_text)
    if age is not None and age >= 60:
        risk_factors.append("Age over 60")
    severity = _severity_of(user_text)

    return {
        "primary_symptoms": primary[:6] or ["unspecified discomfort"],
        "secondary_symptoms": secondary[:6],
        "duration": _duration_of(user_text),
        "severity": severity,
        "onset": _onset_of(user_text),
        "age": age,
        "gender": _gender_of(user_text),
        "existing_conditions": conditions,
        "medications": [],
        "risk_factors": risk_factors,
        "emergency_indicators": emergency,
        "patient_name": None,
        "source": "rules",
    }


# ---------------------------------------------------------------------------
# Demo scenarios (synthetic) — guaranteed risk pathways for the hackathon demo.
# Each case carries a full canned extraction + canned result so the assessment is
# deterministic on stage, regardless of LLM availability.
# ---------------------------------------------------------------------------

def _factor(factor: str, impact: int, detail: str) -> dict:
    return {"factor": factor, "impact": impact, "detail": detail}


SCENARIOS: dict[str, dict] = {
    "low": {
        "label": "Mild Tension Headache",
        "extracted": {
            "primary_symptoms": ["dull aching headache"],
            "secondary_symptoms": ["eye strain"],
            "duration": "1 day",
            "severity": "mild",
            "onset": "gradual",
            "age": 29,
            "gender": "female",
            "existing_conditions": [],
            "medications": [],
            "risk_factors": ["prolonged screen work"],
            "emergency_indicators": [],
            "patient_name": "Sarah Jenkins",
            "source": "scenario",
        },
        "result": {
            "risk_level": "LOW",
            "risk_score": 18,
            "confidence": 94,
            "possible_category": "Neurological - headache pattern",
            "contributing_factors": [
                _factor("Mild pain intensity", 8, "Patient reports mild discomfort only."),
                _factor("No red-flag neurological signs", 0,
                        "No vision loss, neck stiffness, confusion or weakness reported."),
                _factor("Identifiable trigger (screen work)", 5,
                        "Symptoms followed prolonged computer work - a common tension trigger."),
            ],
            "recommended_department": "General Medicine",
            "department_reason": "Headache pattern without red flags - General Medicine can evaluate first-line and refer to Neurology if needed.",
            "guidance": GUIDANCE["LOW"],
            "escalation_required": False,
            "escalation_reason": "",
            "ai_engine": "rule-based engine (demo scenario)",
        },
        "transcript": [
            {"role": "user", "content": "I've had a dull aching headache on both sides of my head since yesterday afternoon after working at my computer."},
            {"role": "assistant", "content": "Thanks for sharing. How severe is the headache - mild, moderate, or severe?"},
            {"role": "user", "content": "It's mild, but it's been there all day."},
            {"role": "assistant", "content": "Understood. Do you have any existing medical conditions or medications?"},
            {"role": "user", "content": "No conditions, I'm 29 and otherwise healthy."},
            {"role": "assistant", "content": "Thank you - I have enough information for a preliminary assessment."},
        ],
    },
    "medium": {
        "label": "Persistent Fever & Fatigue",
        "extracted": {
            "primary_symptoms": ["persistent fever", "body aches"],
            "secondary_symptoms": ["dry cough", "fatigue"],
            "duration": "4 days",
            "severity": "moderate",
            "onset": "gradual",
            "age": 42,
            "gender": "male",
            "existing_conditions": [],
            "medications": [],
            "risk_factors": ["fever duration over 72 hours"],
            "emergency_indicators": [],
            "patient_name": "Marcus Vance",
            "source": "scenario",
        },
        "result": {
            "risk_level": "MEDIUM",
            "risk_score": 52,
            "confidence": 88,
            "possible_category": "General Medicine - systemic infection pattern",
            "contributing_factors": [
                _factor("Fever persisting beyond 72 hours", 10, "Four days of sustained fever."),
                _factor("Moderate symptom intensity", 20, "Fatigue interferes with daily activities."),
                _factor("Multi-system involvement", 12, "Fever, body aches and respiratory symptoms (dry cough)."),
            ],
            "recommended_department": "General Medicine",
            "department_reason": "Systemic viral-pattern symptoms - General Medicine can evaluate and refer to Infectious Disease if needed.",
            "guidance": GUIDANCE["MEDIUM"],
            "escalation_required": False,
            "escalation_reason": "",
            "ai_engine": "rule-based engine (demo scenario)",
        },
        "transcript": [
            {"role": "user", "content": "I've had a fever for 4 days now, with severe body aches, dry cough, and fatigue that makes it hard to get out of bed."},
            {"role": "assistant", "content": "Thanks for sharing. How would you rate the severity - mild, moderate, or severe?"},
            {"role": "user", "content": "Moderate - I can function but it's draining. I'm 42, male."},
            {"role": "assistant", "content": "Understood. Any existing conditions or medications?"},
            {"role": "user", "content": "None."},
            {"role": "assistant", "content": "Thank you - I have enough information for a preliminary assessment."},
        ],
    },
    "high": {
        "label": "Acute Breathing Difficulty",
        "extracted": {
            "primary_symptoms": ["shortness of breath on exertion", "wheezing"],
            "secondary_symptoms": ["chest tightness"],
            "duration": "3 hours",
            "severity": "severe",
            "onset": "sudden",
            "age": 61,
            "gender": "female",
            "existing_conditions": ["Hypertension"],
            "medications": [],
            "risk_factors": ["Age over 60", "Hypertension"],
            "emergency_indicators": [],
            "patient_name": "Elena Rostova",
            "source": "scenario",
        },
        "result": {
            "risk_level": "HIGH",
            "risk_score": 78,
            "confidence": 91,
            "possible_category": "Respiratory - acute breathing difficulty",
            "contributing_factors": [
                _factor("Breathing difficulty (red-flag symptom)", 15, "Dyspnea at low exertion."),
                _factor("Sudden onset", 12, "Symptoms began abruptly three hours ago."),
                _factor("Severe symptom intensity", 35, "Patient rates the difficulty as severe."),
                _factor("Age over 60 with relevant history", 8, "Age 61 with treated hypertension."),
            ],
            "recommended_department": "Pulmonology",
            "department_reason": "Symptoms involve the respiratory system - wheezing and exertional dyspnea suggest a pulmonary pattern.",
            "guidance": GUIDANCE["HIGH"],
            "escalation_required": True,
            "escalation_reason": "HIGH risk level flagged for clinician review",
            "ai_engine": "rule-based engine (demo scenario)",
        },
        "transcript": [
            {"role": "user", "content": "I am experiencing sudden shortness of breath when walking short distances, wheezing, and a tight sensation across my upper chest that started 3 hours ago."},
            {"role": "assistant", "content": "Thanks for sharing. How severe is the breathing difficulty - mild, moderate, or severe?"},
            {"role": "user", "content": "Severe - I'm 61 and I also have hypertension."},
            {"role": "assistant", "content": "Understood. Any medications you currently take?"},
            {"role": "user", "content": "Blood pressure medication."},
            {"role": "assistant", "content": "Thank you - I have enough information for a preliminary assessment."},
        ],
    },
    "critical": {
        "label": "Crushing Chest Pain & Dyspnea",
        "extracted": {
            "primary_symptoms": ["crushing chest pressure", "shortness of breath"],
            "secondary_symptoms": ["dizziness", "cold sweat"],
            "duration": "under 1 hour",
            "severity": "severe",
            "onset": "sudden",
            "age": 58,
            "gender": "male",
            "existing_conditions": ["Hypertension"],
            "medications": [],
            "risk_factors": ["Age over 50", "Hypertension"],
            "emergency_indicators": [
                "crushing chest pressure radiating to jaw and shoulder",
                "heavy sweating with dizziness",
            ],
            "patient_name": "Robert Chen",
            "source": "scenario",
        },
        "result": {
            "risk_level": "CRITICAL",
            "risk_score": 96,
            "confidence": 97,
            "possible_category": "Cardiovascular - possible acute coronary pattern",
            "contributing_factors": [
                _factor("Emergency warning pattern", 50, "Crushing chest pressure radiating to jaw and shoulder with autonomic symptoms."),
                _factor("Severe symptom intensity", 35, "Patient describes overwhelming pressure."),
                _factor("Acute dyspnea with diaphoresis", 15, "Breathing difficulty with cold sweat and presyncope."),
            ],
            "recommended_department": "Emergency Care",
            "department_reason": "Emergency warning indicators detected - immediate professional evaluation required.",
            "guidance": GUIDANCE["CRITICAL"],
            "escalation_required": True,
            "escalation_reason": "Emergency indicators detected - immediate professional care advised",
            "ai_engine": "rule-based engine (demo scenario)",
        },
        "transcript": [
            {"role": "user", "content": "Severe crushing pressure in the center of my chest radiating to my left jaw and shoulder, sweating heavily, feeling dizzy and short of breath."},
            {"role": "assistant", "content": "Your symptoms can indicate a medical emergency - please contact emergency services immediately. I will prepare a preliminary assessment for the clinicians who see you."},
        ],
    },
}


def scenario_case(scenario_id: str) -> tuple[dict, dict, list[dict]]:
    """Return (extracted, result, transcript) for a demo scenario id."""
    case = SCENARIOS[scenario_id]
    return case["extracted"], case["result"], case["transcript"]


# ---------------------------------------------------------------------------
# Deterministic scoring
# ---------------------------------------------------------------------------

def _level_for(score: int, thresholds: dict) -> str:
    if score >= thresholds["critical_min"]:
        return "CRITICAL"
    if score >= thresholds["high_min"]:
        return "HIGH"
    if score >= thresholds["medium_min"]:
        return "MEDIUM"
    return "LOW"


def assess(extracted: dict, thresholds: dict, engine_label: str = "rule-based engine") -> dict:
    """Score an extracted symptom profile into a full preliminary assessment result.

    Every contribution to the score is returned as an explainable factor with its weight.
    """
    primary = [s for s in extracted.get("primary_symptoms", []) if s]
    secondary = [s for s in extracted.get("secondary_symptoms", []) if s]
    all_symptoms = primary + secondary
    text = " ".join(all_symptoms + [extracted.get("duration", "")]).lower()

    emergency = detect_emergency(text) or list(extracted.get("emergency_indicators", []))

    factors: list[dict] = []
    score = 0

    # Severity
    severity = extracted.get("severity", "unknown")
    sev_weight = {"mild": 8, "moderate": 20, "severe": 35}.get(severity, 12)
    score += sev_weight
    sev_detail = (
        f"Patient reports {severity} symptom intensity."
        if severity != "unknown"
        else "Severity not stated - defaulted to moderate weight."
    )
    factors.append(_factor(f"Symptom intensity: {severity}", sev_weight, sev_detail))

    # Number of reported symptoms
    if all_symptoms:
        sym_weight = min(24, 8 * len(all_symptoms))
        score += sym_weight
        factors.append(_factor(
            f"{len(all_symptoms)} reported symptom{'s' if len(all_symptoms) != 1 else ''}",
            sym_weight,
            ", ".join(all_symptoms[:4]) + ("..." if len(all_symptoms) > 4 else ""),
        ))

    # Emergency indicators
    if emergency:
        score += 50
        factors.append(_factor(
            "Emergency warning pattern", 50,
            f"Detected: {'; '.join(emergency[:3])}. Immediate professional care advised.",
        ))

    # Onset
    onset = extracted.get("onset", "unknown")
    if onset == "sudden":
        score += 12
        factors.append(_factor("Sudden onset", 12, "Symptoms began abruptly rather than gradually."))

    # Worsening trajectory
    if "worsen" in text or "getting worse" in text:
        score += 10
        factors.append(_factor("Symptoms worsening", 10, "Patient reports a worsening trajectory."))

    # Persistent duration
    duration = extracted.get("duration", "unknown")
    dm = re.search(r"(\d+)\s*day", duration.lower())
    if dm and int(dm.group(1)) >= 3:
        score += 10
        factors.append(_factor(
            "Symptoms persisting beyond 72 hours", 10, f"Reported duration: {duration}."
        ))

    # Age
    age = extracted.get("age")
    if age is not None:
        if age >= 60:
            score += 8
            factors.append(_factor("Age over 60", 8, f"Age {int(age)} - elevated baseline risk."))
        elif age <= 5:
            score += 8
            factors.append(_factor("Pediatric age factor", 8, f"Age {int(age)} - young patients need lower thresholds."))
        elif age >= 50:
            score += 4
            factors.append(_factor("Age over 50", 4, f"Age {int(age)} - mildly elevated baseline risk."))

    # Existing conditions
    conditions = [c for c in extracted.get("existing_conditions", []) if c]
    if conditions:
        cond_weight = min(12, 6 * len(conditions))
        score += cond_weight
        factors.append(_factor(
            "Relevant patient history", cond_weight, f"Existing conditions: {', '.join(conditions[:3])}."
        ))

    # Category matching (for possible_category + department + ambiguity)
    matched: dict[str, list[str]] = {}
    for cat, kws in CATEGORY_KEYWORDS.items():
        hits = [kw for kw in kws if kw in text]
        if hits:
            matched[cat] = hits
    categories = list(matched.keys()) or ["General Medicine"]

    if emergency:
        if "chest" in text:
            category = "Cardiovascular"
        elif any(k in text for k in ("breath", "breathe")):
            category = "Respiratory"
        else:
            category = "General Medicine"
    else:
        category = max(categories, key=lambda c: len(matched[c]))

    if emergency:
        recommended_department = "Emergency Care"
        department_reason = (
            "Emergency warning indicators detected - immediate professional evaluation required."
        )
    elif len(categories) >= 3:
        recommended_department = "General Medicine"
        department_reason = (
            "Symptoms span multiple body systems - General Medicine can evaluate and refer."
        )
    else:
        recommended_department = DEPARTMENT_BY_CATEGORY.get(category, "General Medicine")
        department_reason = f"Symptoms involve the {category.lower()} system."

    # Level + clamp
    if emergency:
        level = "CRITICAL"
        score = max(score, 92)
    else:
        score = min(100, max(1, score))
        level = _level_for(score, thresholds)

    # Confidence
    confidence = 50 + min(30, 8 * len(all_symptoms))
    if extracted.get("duration", "unknown") != "unknown":
        confidence += 6
    if onset != "unknown":
        confidence += 6
    if severity != "unknown":
        confidence += 6
    if age is not None:
        confidence += 4
    if emergency:
        confidence += 15
    if len(matched) >= 3:
        confidence -= 10
    confidence = int(max(45, min(98, confidence)))

    # Escalation (human-in-the-loop)
    reasons = []
    if emergency:
        reasons.append("Emergency indicators detected - immediate professional care advised")
    if level in ("HIGH", "CRITICAL"):
        reasons.append(f"{level} risk level flagged for clinician review")
    conf_threshold = thresholds.get("confidence_review_threshold", 60)
    if confidence < conf_threshold:
        reasons.append(
            f"AI confidence {confidence}% is below the review threshold ({conf_threshold}%)"
        )
    if len(matched) >= 3:
        reasons.append("Symptom pattern spans multiple body systems - clinician review recommended")

    return {
        "risk_level": level,
        "risk_score": score,
        "confidence": confidence,
        "possible_category": category,
        "contributing_factors": factors,
        "recommended_department": recommended_department,
        "department_reason": department_reason,
        "guidance": GUIDANCE[level],
        "escalation_required": bool(reasons),
        "escalation_reason": " | ".join(reasons),
        "ai_engine": engine_label,
    }
