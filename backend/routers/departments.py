"""Hospital departments with live assessment counts."""

from fastapi import APIRouter

from lib.db import db
from lib.dates import normalize_datetimes
from models.schemas import Department

router = APIRouter()


@router.get("/departments", response_model=list[Department])
async def list_departments() -> list[Department]:
    depts = await db.departments.find().sort("name", 1).to_list(100)

    counts: dict[str, int] = {}
    async for row in db.assessments.aggregate(
        [{"$group": {"_id": "$recommended_department", "n": {"$sum": 1}}}]
    ):
        counts[row["_id"]] = row["n"]

    doctor_counts: dict[str, int] = {}
    async for row in db.doctors.aggregate(
        [{"$group": {"_id": "$department_id", "n": {"$sum": 1}}}]
    ):
        doctor_counts[row["_id"]] = row["n"]

    result = []
    for d in depts:
        d["assessment_count"] = counts.get(d["name"], 0)
        d["doctor_count"] = doctor_counts.get(d["id"], 0)
        result.append(Department(**normalize_datetimes(d)))
    return result
