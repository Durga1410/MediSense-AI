"""Assessment CRUD: create (REST surface for integrations), list with filters, detail."""

from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.dates import normalize_datetimes
from models.schemas import Assessment, AssessmentCreate
from services import records
from services.engine import assess as engine_assess

router = APIRouter()


@router.post("/assessments", response_model=Assessment)
async def create_assessment(body: AssessmentCreate) -> Assessment:
    """REST surface for n8n / manual integrations - runs the same deterministic engine."""
    extracted = {
        "primary_symptoms": body.primary_symptoms,
        "secondary_symptoms": body.secondary_symptoms,
        "duration": body.duration,
        "severity": body.severity,
        "onset": body.onset,
        "age": body.age,
        "gender": body.gender,
        "existing_conditions": body.existing_conditions,
        "medications": body.medications,
        "risk_factors": list(body.existing_conditions),
        "emergency_indicators": [],
        "patient_name": body.patient_name,
        "source": "api",
    }
    thresholds = await records.get_thresholds()
    result = engine_assess(extracted, thresholds)
    patient = await records.upsert_patient(extracted)
    return await records.create_assessment(
        extracted, result, patient, [m.model_dump() for m in body.transcript]
    )


@router.get("/assessments", response_model=list[Assessment])
async def list_assessments(
    risk: str | None = None,
    department: str | None = None,
    review_status: str | None = None,
    q: str | None = None,
    limit: int = 200,
) -> list[Assessment]:
    query: dict = {}
    if risk:
        query["risk_level"] = risk.upper()
    if department:
        query["recommended_department"] = department
    if review_status:
        query["review_status"] = review_status
    if q:
        query["$or"] = [
            {"assessment_code": {"$regex": q, "$options": "i"}},
            {"patient_name": {"$regex": q, "$options": "i"}},
            {"patient_id": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.assessments.find(query).sort("created_at", -1).to_list(limit)
    return [Assessment(**normalize_datetimes(d)) for d in docs]


@router.get("/assessments/{assessment_id}", response_model=Assessment)
async def get_assessment(assessment_id: str) -> Assessment:
    doc = await db.assessments.find_one({"id": assessment_id}) or await db.assessments.find_one(
        {"assessment_code": assessment_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="assessment not found")
    return Assessment(**normalize_datetimes(doc))
