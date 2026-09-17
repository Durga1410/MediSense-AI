"""LLM layer for MediSense AI (hybrid engine).

- Conversation replies stream via emergentintegrations `stream_message` (user-facing).
- Symptom extraction is a machine-facing non-streaming JSON call (`send_message`).
- Every LLM path degrades to the deterministic engine, so the product works with the
  AI key absent, misconfigured, or failing. The key lives in backend/.env only.
"""

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

from services.engine import fallback_extract

logger = logging.getLogger(__name__)

try:  # the package is preinstalled; guard anyway so an import failure never breaks the app
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except Exception as _exc:  # pragma: no cover
    logger.warning("emergentintegrations unavailable: %s", _exc)
    LlmChat = None  # type: ignore[assignment]
    UserMessage = None  # type: ignore[assignment]

AI_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
AI_PROVIDER = os.environ.get("AI_PROVIDER", "openai")
AI_MODEL = os.environ.get("AI_MODEL", "gpt-5.4")


def llm_available() -> bool:
    return bool(LlmChat is not None and AI_KEY)


NURSE_SYSTEM_PROMPT = """You are MediSense AI, a careful medical triage assistant in a hackathon prototype.

RULES:
- Ask exactly ONE short follow-up question per reply. Warm, plain language, at most two sentences.
- Gather over a few turns: main symptoms, duration, severity (mild/moderate/severe), onset (sudden/gradual), age, gender, existing conditions, medications.
- NEVER diagnose, never state a disease as certain, never prescribe or suggest specific medications or doses.
- Use phrases like "preliminary assessment" and "possible health category". You provide preliminary guidance only, not a diagnosis.
- If the user describes a medical emergency (crushing chest pain, severe breathlessness, stroke signs, heavy bleeding, fainting), immediately and firmly advise calling local emergency services, then offer to prepare a preliminary assessment for the clinicians.
- Once you know the symptoms, duration, severity and rough age (or after 6 exchanges), stop asking and say you have enough information and the patient can generate the preliminary assessment."""

EXTRACT_SYSTEM_PROMPT = """You extract structured symptom information from a MediSense AI triage conversation.
Return ONLY minified JSON, no markdown fences, no commentary, matching exactly:
{"primary_symptoms":[str,...],"secondary_symptoms":[str,...],"duration":str,"severity":"mild|moderate|severe|unknown","onset":"sudden|gradual|unknown","age":int|null,"gender":"male|female|other|unknown","existing_conditions":[str,...],"medications":[str,...],"emergency_indicators":[str,...],"patient_name":str|null}
Use short lowercase symptom phrases ("chest discomfort", "shortness of breath"). Use "unknown" when not stated."""


def llm_enabled() -> bool:
    return llm_available()


def _new_chat(session_id: str, system_message: str):
    return LlmChat(
        api_key=AI_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(AI_PROVIDER, AI_MODEL)


def _render(messages: list[dict]) -> str:
    return "\n".join(f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages)


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def stream_reply(messages: list[dict], scenario: str | None = None) -> AsyncIterator[str]:
    """Stream the triage nurse's next reply as text deltas.

    Raises on any failure (missing key, API error, empty stream) so the caller can fall
    back to the scripted conversation.
    """
    if not llm_available():
        raise RuntimeError("LLM not configured")

    chat = _new_chat(
        f"medisense-{session_hash(messages)}",
        NURSE_SYSTEM_PROMPT
        + (f"\nThis conversation is a scripted DEMO SCENARIO ({scenario}); stay in character." if scenario else ""),
    )
    prompt = (
        "Conversation so far:\n"
        + _render(messages)
        + "\n\nRespond with your single next message (one short question, or the wrap-up)."
    )
    yielded = 0
    accumulated = ""
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        content = getattr(ev, "content", None)
        if not content:
            continue
        if content == accumulated:  # final full-text echo event — not a new delta
            break
        accumulated += content
        yielded += len(content)
        yield content
    if yielded == 0:
        raise RuntimeError("LLM returned an empty stream")


def session_hash(messages: list[dict]) -> str:
    return uuid.uuid5(uuid.NAMESPACE_URL, _render(messages)[:2000]).hex[:16]


async def extract_symptoms(messages: list[dict]) -> tuple[dict, str]:
    """Extract structured symptoms from a transcript. Returns (extracted, source).

    Falls back to the deterministic rule-based extractor on any failure.
    """
    if not messages:
        return fallback_extract([]), "rules"
    if not llm_available():
        return fallback_extract(messages), "rules"
    try:
        chat = _new_chat("medisense-extract-" + session_hash(messages), EXTRACT_SYSTEM_PROMPT)
        prompt = (
            "Transcript:\n" + _render(messages)
            + "\n\nReturn the JSON object only."
        )
        raw = await chat.send_message(UserMessage(text=prompt))
        text = raw if isinstance(raw, str) else getattr(raw, "content", str(raw))
        fence = re.search(r"\{.*\}", text, re.DOTALL)
        if not fence:
            raise ValueError("no JSON in extraction response")
        data = json.loads(fence.group(0))
        base = fallback_extract(messages)
        merged = {**base, **{k: v for k, v in data.items() if v not in (None, [], "")}}
        if isinstance(merged.get("age"), float):
            merged["age"] = int(round(merged["age"]))
        merged["source"] = "llm"
        return merged, "llm"
    except Exception as exc:
        logger.warning("LLM extraction failed (%s) - falling back to rules", exc)
        return fallback_extract(messages), "rules"
