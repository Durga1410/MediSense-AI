"""Server-side date helpers. The pod clock is UTC — anchor "today" here, never in the browser."""

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def today_iso(tz: str | None = None) -> str:
    """Today's date as YYYY-MM-DD in `tz` (default: APP_TZ env, else UTC)."""
    zone = tz or os.environ.get("APP_TZ", "UTC")
    return datetime.now(ZoneInfo(zone)).strftime("%Y-%m-%d")


def aware(dt: datetime) -> datetime:
    """Motor hands naive datetimes back (BSON stores UTC) — re-anchor to aware UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def normalize_datetimes(doc: dict) -> dict:
    """Recursively re-anchor every naive datetime in a Mongo document to aware UTC."""
    for key, value in list(doc.items()):
        if isinstance(value, datetime) and value.tzinfo is None:
            doc[key] = value.replace(tzinfo=timezone.utc)
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    normalize_datetimes(item)
        elif isinstance(value, dict):
            normalize_datetimes(value)
    return doc
