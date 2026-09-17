"""Record-creation service shared by the AI router and the REST CRUD surface.

Owns: settings/thresholds lookup, patient upsert, assessment persistence, human-review
creation, and the optional fire-and-forget n8n webhook notification.
"""

import logging
import os
import uuid
from datetime import datetime, timezone

import httpx

from lib.db import db
from models.schemas import (
    Assessment,
    ChatMessage,
    ContributingFactor,
    ExtractedSummary,
    HumanReview,
    Patient,
    Thresholds,
)
from services.engine import DISCLAIMER

logger = logging.getLogger(__name__)


async def get_thresholds() -> dict:
    """Configurable thresholds: settings collection wins, env vars are the defaults."""
    env_defaults = {
        "medium_min": int(os.environ.get("RISK_MEDIUM_MIN", 30)),
        "high_min": int(os.environ.get("RISK_HIGH_MIN", 60)),
        "critical_min": int(os.environ.get("RISK_CRITICAL_MIN", 85)),
        "confidence_review_threshold": int(os.environ.get("CONFIDENCE_REVIEW_THRESHOLD", 60)),
    }
    doc = await db.settings.find_one({"key": "app"}) or {}
    saved = doc.get("thresholds") or {}
    return {**env_defaults, **{k: v for k, v in saved.items() if v is not None}}


async def get_app_settings_doc() -> dict:
    return await db.settings.find_one({"key": "app"}) or {}


async def next_patient_code() -> str:
    count = await db.patients.count_documents({})
    code = f"PT-{1001 + count:04d}"
    if await db.patients.find_one({"patient_code": code}):
        code = "PT-" + uuid.uuid4().hex[:6].upper()
        while await db.patients.find_one({"patient_code": code}):
            code = "PT-" + uuid.uuid4().hex[:6].upper()
    return code


async def next_assessment_code() -> str:
    count = await db.assessments.count_documents({})
    code = f"AS-{1001 + count:04d}"
    if await db.assessments.find_one({"assessment_code": code}):
        code = "AS-" + uuid.uuid4().hex[:6].upper()
        while await db.assessments.find_one({"assessment_code": code}):
            code = "AS-" + uuid.uuid4().hex[:6].upper()
    return code


async def upsert_patient(extracted: dict) -> Patient:
    """Create a synthetic demo patient for this assessment (never real patient data)."""
    name = (extracted.get("patient_name") or "").strip() or "Demo Patient"
    patient = Patient(
        patient_code=await next_patient_code(),
        name=name,
        age=extracted.get("age"),
        gender=extracted.get("gender", "unknown") or "unknown",
        status="Active",
    )
    await db.patients.insert_one(patient.model_dump())
    return patient


async def create_assessment(
    extracted: dict,
    result: dict,
    patient: Patient,
    transcript: list[dict],
    scenario: str | None = None,
) -> Assessment:
    thresholds = await get_thresholds()
    level = result["risk_level"]

    now = datetime.now(timezone.utc)
    assessment = Assessment(
        assessment_code=await next_assessment_code(),
        patient_id=patient.id,
        patient_name=patient.name,
        age=patient.age,
        gender=patient.gender,
        primary_symptoms=extracted.get("primary_symptoms", []),
        secondary_symptoms=extracted.get("secondary_symptoms", []),
        duration=extracted.get("duration", "unknown"),
        severity=extracted.get("severity", "unknown"),
        onset=extracted.get("onset", "unknown"),
        existing_conditions=extracted.get("existing_conditions", []),
        medications=extracted.get("medications", []),
        risk_factors=extracted.get("risk_factors", []),
        emergency_indicators=extracted.get("emergency_indicators", []),
        risk_level=level,
        risk_score=int(result["risk_score"]),
        confidence=int(result["confidence"]),
        possible_category=result["possible_category"],
        contributing_factors=[ContributingFactor(**f) for f in result.get("contributing_factors", [])],
        recommended_department=result["recommended_department"],
        department_reason=result.get("department_reason", ""),
        guidance=result["guidance"],
        escalation_required=bool(result.get("escalation_required")),
        escalation_reason=result.get("escalation_reason", ""),
        review_status="pending",
        transcript=[],
        ai_engine=result.get("ai_engine", "rule-based engine"),
        scenario=scenario,
        created_at=now,
    )
    assessment.transcript = [
        ChatMessage(role=m["role"], content=m["content"], created_at=m.get("created_at") or now)
        for m in transcript
    ]
    if not assessment.escalation_required:
        assessment.review_status = "not_required"

    await db.assessments.insert_one(assessment.model_dump())

    # Link symptoms (assessment_symptoms) for the relational-style schema.
    symptom_docs = []
    for s in assessment.primary_symptoms + assessment.secondary_symptoms:
        symptom_docs.append({
            "id": str(uuid.uuid4()),
            "assessment_id": assessment.id,
            "symptom_name": s,
        })
    if symptom_docs:
        await db.assessment_symptoms.insert_many(
            [{**s, "created_at": now} for s in symptom_docs]
        )

    if assessment.escalation_required:
        await create_review(
            assessment_id=assessment.id,
            assessment_code=assessment.assessment_code,
            patient_id=patient.id,
            patient_name=patient.name,
            risk_level=level,
            confidence=assessment.confidence,
            reason=assessment.escalation_reason,
        )

    # Keep the patient's "last assessment" snapshot fresh.
    await db.patients.update_one(
        {"id": patient.id},
        {
            "$set": {
                "last_assessment": now.strftime("%Y-%m-%d"),
                "risk_level": level,
                "department": assessment.recommended_department,
            }
        },
    )

    await notify_n8n(assessment)
    return assessment


async def create_review(
    assessment_id: str,
    assessment_code: str,
    patient_id: str,
    patient_name: str,
    risk_level: str,
    confidence: int,
    reason: str,
) -> HumanReview | None:
    """Idempotent: one review case per assessment (unique index backs this up)."""
    existing = await db.human_reviews.find_one({"assessment_id": assessment_id})
    if existing:
        return HumanReview(**existing)
    review = HumanReview(
        assessment_id=assessment_id,
        assessment_code=assessment_code,
        patient_id=patient_id,
        patient_name=patient_name,
        risk_level=risk_level,
        confidence=confidence,
        reason=reason,
        status="pending",
    )
    await db.human_reviews.insert_one(review.model_dump())
    await db.assessments.update_one(
        {"id": assessment_id}, {"$set": {"review_status": "pending"}}
    )
    return review


async def notify_n8n(assessment: Assessment) -> None:
    """Optional outbound webhook: MediSense -> n8n. Never blocks or fails the core flow."""
    settings_doc = await get_app_settings_doc()
    url = (settings_doc.get("n8n_webhook_url") or "").strip()
    if not url:
        return
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                url,
                json={
                    "event": "assessment.created",
                    "assessment_id": assessment.id,
                    "assessment_code": assessment.assessment_code,
                    "risk_level": assessment.risk_level,
                    "risk_score": assessment.risk_score,
                    "confidence": assessment.confidence,
                    "recommended_department": assessment.recommended_department,
                    "escalation_required": assessment.escalation_required,
                    "disclaimer": DISCLAIMER,
                },
            )
    except Exception as exc:
        logger.info("n8n webhook not delivered (%s) - core flow unaffected", exc)
