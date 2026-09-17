"""App settings: configurable AI thresholds + integration status."""

from fastapi import APIRouter

from lib.db import db
from models.schemas import AppSettings, IntegrationStatus, Thresholds
from services import llm, records

router = APIRouter()


@router.get("/settings", response_model=AppSettings)
async def get_settings() -> AppSettings:
    doc = await records.get_app_settings_doc()
    return AppSettings(
        thresholds=Thresholds(**(doc.get("thresholds") or {})),
        n8n_webhook_url=doc.get("n8n_webhook_url", ""),
    )


@router.put("/settings", response_model=AppSettings)
async def put_settings(body: AppSettings) -> AppSettings:
    await db.settings.update_one(
        {"key": "app"}, {"$set": body.model_dump()}, upsert=True
    )
    return body


@router.get("/settings/integrations", response_model=IntegrationStatus)
async def get_integrations() -> IntegrationStatus:
    """Integration status for the Settings console (no secrets in the response)."""
    doc = await records.get_app_settings_doc()
    webhook = (doc.get("n8n_webhook_url") or "").strip()
    thresholds = await records.get_thresholds()
    return IntegrationStatus(
        n8n_connected=bool(webhook),
        n8n_webhook_url=webhook,
        ai_provider=llm.AI_PROVIDER,
        ai_model=llm.AI_MODEL,
        ai_available=llm.llm_available(),
        thresholds=Thresholds(**thresholds),
    )
