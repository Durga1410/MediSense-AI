"""Dashboard aggregates (synthetic demo data)."""

from datetime import timedelta

from fastapi import APIRouter

from lib.db import db
from models.schemas import DashboardStats, DepartmentCount, TrendPoint
from services.engine import LEVELS

router = APIRouter()

TREND_DAYS = 14


@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats() -> DashboardStats:
    total = await db.assessments.count_documents({})

    risk_counts = {level: 0 for level in LEVELS}
    async for row in db.assessments.aggregate(
        [{"$group": {"_id": "$risk_level", "n": {"$sum": 1}}}]
    ):
        if row["_id"] in risk_counts:
            risk_counts[row["_id"]] = row["n"]

    reviews_total = await db.human_reviews.count_documents({})
    reviews_pending = await db.human_reviews.count_documents({"status": "pending"})
    reviews_reviewed = await db.human_reviews.count_documents({"status": "reviewed"})

    avg_confidence = 0.0
    async for row in db.assessments.aggregate(
        [{"$group": {"_id": None, "avg": {"$avg": "$confidence"}}}]
    ):
        avg_confidence = round(row["avg"], 1)

    # Assessment trend over the last TREND_DAYS days (server-side UTC clock).
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=TREND_DAYS - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    by_day: dict[str, int] = {}
    async for row in db.assessments.aggregate(
        [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "n": {"$sum": 1}}},
        ]
    ):
        by_day[row["_id"]] = row["n"]
    trend = [
        TrendPoint(date=(since + timedelta(days=i)).strftime("%Y-%m-%d"),
                   count=by_day.get((since + timedelta(days=i)).strftime("%Y-%m-%d"), 0))
        for i in range(TREND_DAYS)
    ]

    departments = []
    async for row in db.assessments.aggregate(
        [
            {"$group": {"_id": "$recommended_department", "n": {"$sum": 1}}},
            {"$sort": {"n": -1}},
            {"$limit": 9},
        ]
    ):
        if row["_id"]:
            departments.append(DepartmentCount(name=row["_id"], count=row["n"]))

    return DashboardStats(
        total_assessments=total,
        low=risk_counts["LOW"],
        medium=risk_counts["MEDIUM"],
        high=risk_counts["HIGH"],
        critical=risk_counts["CRITICAL"],
        human_reviews_total=reviews_total,
        human_reviews_pending=reviews_pending,
        human_reviews_reviewed=reviews_reviewed,
        avg_confidence=avg_confidence,
        trend=trend,
        departments=departments,
    )
