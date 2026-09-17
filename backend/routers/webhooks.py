"""Optional n8n webhook surface - the core app never depends on n8n being reachable."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter

from lib.db import db
from models.schemas import N8nWebhookRequest, N8nWebhookResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/webhooks/n8n/assessment", response_model=N8nWebhookResponse)
async def n8n_assessment_webhook(body: N8nWebhookRequest) -> N8nWebhookResponse:
    """Receives (or simulates) the MediSense -> n8n handoff for a workflow run.

    Pipeline once connected: assessment -> risk classification -> human review
    notification -> audit/report workflow. The core app works without n8n.
    """
    actions = ["payload_received"]
    assessment = None
    if body.assessment_id:
        assessment = await db.assessments.find_one(
            {"id": body.assessment_id}
        ) or await db.assessments.find_one({"assessment_code": body.assessment_id})
        if assessment:
            actions.append("risk_classified")
            if assessment.get("escalation_required"):
                actions.append("human_review_notification_queued")
            actions.append("audit_report_generated")
        else:
            actions.append("assessment_not_found")
    if body.data:
        actions.append("custom_payload_accepted")

    return N8nWebhookResponse(
        received=True,
        assessment_id=body.assessment_id,
        actions=actions,
        forwarded_at=datetime.now(timezone.utc),
    )
