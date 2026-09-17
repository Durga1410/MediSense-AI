"""Patient directory (synthetic demo data only)."""

from datetime import datetime, timezone

from fastapi import APIRouter

from lib.db import db
from lib.dates import normalize_datetimes
from models.schemas import Patient, PatientCreate
from services import records

router = APIRouter()


@router.get("/patients", response_model=list[Patient])
async def list_patients(
    q: str | None = None,
    risk: str | None = None,
    department: str | None = None,
    limit: int = 300,
) -> list[Patient]:
    query: dict = {}
    if risk:
        query["risk_level"] = risk.upper()
    if department:
        query["department"] = department
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"patient_code": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.patients.find(query).sort("created_at", -1).to_list(limit)
    return [Patient(**normalize_datetimes(d)) for d in docs]


@router.post("/patients", response_model=Patient)
async def create_patient(body: PatientCreate) -> Patient:
    patient = Patient(
        patient_code=await records.next_patient_code(),
        name=body.name,
        age=body.age,
        gender=body.gender,
        created_at=datetime.now(timezone.utc),
    )
    await db.patients.insert_one(patient.model_dump())
    return patient
