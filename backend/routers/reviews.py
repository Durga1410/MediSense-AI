"""Human-in-the-loop review queue."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.dates import normalize_datetimes
from models.schemas import HumanReview, HumanReviewCreate, HumanReviewUpdate
from services import records

router = APIRouter()


@router.get("/human-review", response_model=list[HumanReview])
async def list_reviews(
    status: str | None = None,
    risk: str | None = None,
    confidence_max: int | None = None,
    limit: int = 300,
) -> list[HumanReview]:
    query: dict = {}
    if status:
        query["status"] = status
    if risk:
        query["risk_level"] = risk.upper()
    if confidence_max is not None:
        query["confidence"] = {"$lt": confidence_max}
    docs = await db.human_reviews.find(query).sort("created_at", -1).to_list(limit)
    return [HumanReview(**normalize_datetimes(d)) for d in docs]


@router.post("/human-review", response_model=HumanReview)
async def create_review(body: HumanReviewCreate) -> HumanReview:
    """Request human review for an assessment (idempotent - one case per assessment)."""
    doc = await db.assessments.find_one({"id": body.assessment_id}) or await db.assessments.find_one(
        {"assessment_code": body.assessment_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="assessment not found")
    review = await records.create_review(
        assessment_id=doc["id"],
        assessment_code=doc["assessment_code"],
        patient_id=doc["patient_id"],
        patient_name=doc["patient_name"],
        risk_level=doc["risk_level"],
        confidence=doc["confidence"],
        reason=body.reason,
    )
    if review is None:  # pragma: no cover - create_review returns existing on repeats
        existing = await db.human_reviews.find_one({"assessment_id": doc["id"]})
        review = HumanReview(**normalize_datetimes(existing))
    return review


@router.patch("/human-review/{review_id}", response_model=HumanReview)
async def update_review(review_id: str, body: HumanReviewUpdate) -> HumanReview:
    doc = await db.human_reviews.find_one({"id": review_id})
    if not doc:
        raise HTTPException(status_code=404, detail="review case not found")
    updates: dict = {"reviewer_notes": body.reviewer_notes or doc.get("reviewer_notes", "")}
    if body.status == "reviewed":
        updates["status"] = "reviewed"
        updates["reviewed_at"] = datetime.now(timezone.utc)
    await db.human_reviews.update_one({"id": review_id}, {"$set": updates})
    if updates.get("status") == "reviewed":
        await db.assessments.update_one(
            {"id": doc["assessment_id"]}, {"$set": {"review_status": "reviewed"}}
        )
    updated = await db.human_reviews.find_one({"id": review_id})
    return HumanReview(**normalize_datetimes(updated))
