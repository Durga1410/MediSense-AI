"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "patients": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("patient_code", ASCENDING)], name="patient_code", unique=True),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("risk_level", ASCENDING)], name="risk_level"),
        IndexModel([("department", ASCENDING)], name="department"),
    ],
    "assessments": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("assessment_code", ASCENDING)], name="assessment_code", unique=True),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("patient_id", ASCENDING)], name="patient_id"),
        IndexModel([("risk_level", ASCENDING), ("created_at", DESCENDING)], name="risk_created"),
        IndexModel([("review_status", ASCENDING)], name="review_status"),
        IndexModel([("recommended_department", ASCENDING)], name="department"),
    ],
    "departments": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("name", ASCENDING)], name="name", unique=True),
    ],
    "doctors": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("department_id", ASCENDING)], name="department_id"),
    ],
    "symptoms": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("name", ASCENDING)], name="name", unique=True),
    ],
    "assessment_symptoms": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("assessment_id", ASCENDING)], name="assessment_id"),
    ],
    "human_reviews": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("assessment_id", ASCENDING)], name="assessment_id", unique=True),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
    ],
    "conversations": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("updated_at", DESCENDING)], name="updated_desc"),
    ],
    "settings": [IndexModel([("key", ASCENDING)], name="key", unique=True)],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
