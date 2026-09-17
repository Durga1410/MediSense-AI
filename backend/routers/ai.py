"""AI conversation + preliminary assessment endpoints (the core MediSense flow)."""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from lib.db import db
from lib.dates import normalize_datetimes
from models.schemas import (
    AssessRequest,
    Assessment,
    ChatTurnRequest,
    Conversation,
    ExtractRequest,
    ExtractedSummary,
)
from services import llm, records
from services.engine import (
    GREETING,
    SCRIPTED_REPLIES,
    URGENT_REPLY,
    assess as engine_assess,
    detect_emergency,
    scenario_case,
)

logger = logging.getLogger(__name__)
router = APIRouter()

CHUNK = 28  # fallback replay is "streamed" in small chunks for a natural feel


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


def _scripted_reply(messages: list[dict]) -> str:
    n = len([m for m in messages if m.get("role") == "user"])
    return SCRIPTED_REPLIES[min(n - 1, len(SCRIPTED_REPLIES) - 1)]


async def _get_or_create_conversation(session_id: str | None, scenario: str | None) -> dict:
    if session_id:
        conv = await db.conversations.find_one({"id": session_id})
        if conv:
            return conv
    now = datetime.now(timezone.utc)
    conv = {
        "id": str(uuid.uuid4()),
        "messages": [{"role": "assistant", "content": GREETING, "created_at": now}],
        "scenario": scenario,
        "created_at": now,
        "updated_at": now,
        "extracted": None,
        "emergency_warned": False,
    }
    await db.conversations.insert_one(conv)
    return conv


@router.post("/ai/chat/stream")
async def chat_stream(body: ChatTurnRequest):
    """Stream one triage-nurse reply as server-sent events.

    Safety first: emergency-pattern messages get the deterministic urgent reply (the LLM
    never improvises on emergencies). LLM failures degrade to the scripted conversation.
    """
    conv = await _get_or_create_conversation(body.session_id, body.scenario)
    scenario = body.scenario or conv.get("scenario")
    now = datetime.now(timezone.utc)
    user_msg = {"role": "user", "content": body.message, "created_at": now}
    messages = list(conv.get("messages", [])) + [user_msg]

    async def gen():
        reply_chunks: list[str] = []
        emergency_hits = detect_emergency(body.message)
        use_urgent = bool(emergency_hits) and not conv.get("emergency_warned")
        try:
            if use_urgent:
                # Deterministic safety reply.
                for i in range(0, len(URGENT_REPLY), CHUNK):
                    chunk = URGENT_REPLY[i : i + CHUNK]
                    reply_chunks.append(chunk)
                    yield _sse({"type": "delta", "content": chunk})
                    await asyncio.sleep(0.01)
            else:
                it = llm.stream_reply(messages, scenario).__aiter__()
                while True:
                    try:
                        delta = await asyncio.wait_for(it.__anext__(), timeout=25)
                    except StopAsyncIteration:
                        break
                    reply_chunks.append(delta)
                    yield _sse({"type": "delta", "content": delta})
        except Exception as exc:
            logger.warning("LLM chat failed (%s) - falling back to scripted reply", exc)

        if not reply_chunks:
            reply = _scripted_reply(messages)
            for i in range(0, len(reply), CHUNK):
                chunk = reply[i : i + CHUNK]
                reply_chunks.append(chunk)
                yield _sse({"type": "delta", "content": chunk})
                await asyncio.sleep(0.01)

        reply_text = "".join(reply_chunks)
        assistant_msg = {
            "role": "assistant",
            "content": reply_text,
            "created_at": datetime.now(timezone.utc),
        }
        await db.conversations.update_one(
            {"id": conv["id"]},
            {
                "$set": {
                    "messages": messages + [assistant_msg],
                    "updated_at": assistant_msg["created_at"],
                    "scenario": scenario,
                    "emergency_warned": bool(conv.get("emergency_warned")) or use_urgent,
                }
            },
        )
        yield _sse({
            "type": "done",
            "session_id": conv["id"],
            "message": {"role": "assistant", "content": reply_text},
        })

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/ai/extract")
async def ai_extract(body: ExtractRequest) -> ExtractedSummary:
    """Extract structured symptom info and show it as a summary card before assessing."""
    conv = None
    if body.session_id:
        conv = await db.conversations.find_one({"id": body.session_id})
    scenario = body.scenario or (conv or {}).get("scenario")

    if conv and conv.get("extracted"):
        return ExtractedSummary(**conv["extracted"])

    if scenario:
        extracted_raw, _, _ = scenario_case(scenario)
        extracted_raw = {**extracted_raw, "source": "scenario"}
        messages = []
    else:
        if not conv:
            raise HTTPException(status_code=404, detail="conversation not found")
        messages = conv.get("messages", [])
        if not any(m.get("role") == "user" for m in messages):
            raise HTTPException(status_code=422, detail="no symptoms described yet")
        extracted_raw, source = await llm.extract_symptoms(messages)
        if source == "llm":
            engine_label = f"LLM hybrid ({llm.AI_PROVIDER}/{llm.AI_MODEL} + rule engine)"
        else:
            engine_label = "rule-based engine (LLM fallback)"

    extracted = ExtractedSummary(**extracted_raw)
    if conv:
        await db.conversations.update_one(
            {"id": conv["id"]}, {"$set": {"extracted": extracted.model_dump()}}
        )
    return extracted


@router.post("/ai/assess", response_model=Assessment)
async def ai_assess(body: AssessRequest) -> Assessment:
    """Run the preliminary assessment engine on the conversation (or a demo scenario)."""
    conv = None
    if body.session_id:
        conv = await db.conversations.find_one({"id": body.session_id})
    scenario = body.scenario or (conv or {}).get("scenario")
    thresholds = await records.get_thresholds()

    if scenario:
        extracted_raw, result, transcript_raw = scenario_case(scenario)
        transcript = transcript_raw
    else:
        if not conv:
            raise HTTPException(status_code=422, detail="session_id required")
        messages = conv.get("messages", [])
        if not any(m.get("role") == "user" for m in messages):
            raise HTTPException(status_code=422, detail="no symptoms described yet")
        extracted_raw, source = await llm.extract_symptoms(messages)
        engine_label = (
            f"LLM hybrid ({llm.AI_PROVIDER}/{llm.AI_MODEL} + rule engine)"
            if source == "llm"
            else "rule-based engine (LLM fallback)"
        )
        result = engine_assess(extracted_raw, thresholds, engine_label=engine_label)
        transcript = messages

    extracted = ExtractedSummary(**extracted_raw).model_dump()
    patient = await records.upsert_patient(extracted)
    assessment = await records.create_assessment(extracted, result, patient, transcript, scenario)
    if conv:
        await db.conversations.update_one(
            {"id": conv["id"]}, {"$set": {"extracted": extracted}}
        )
    return assessment


@router.get("/ai/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str) -> Conversation:
    conv = await db.conversations.find_one({"id": conversation_id})
    if not conv:
        raise HTTPException(status_code=404, detail="conversation not found")
    return Conversation(**normalize_datetimes(conv))
