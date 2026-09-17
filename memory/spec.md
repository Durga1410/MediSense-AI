# MediSense AI — app spec

**What it is:** AI-powered medical assistant (hackathon HC-02 prototype) for preliminary
assessment & healthcare guidance. NOT a diagnosis tool — "possible health category",
"risk level", "confidence", safe guidance, emergency escalation. Open access (no auth) —
staff pages are visible to everyone for the demo.

## Key flows
1. **Landing `/`** — hero, 3 feature cards, emergency notice, one-click demo scenarios
   (`/assessment?scenario=low|medium|high|critical`).
2. **AI Assessment `/assessment`** — streaming chat (POST `/api/ai/chat/stream`, SSE) with
   LLM triage nurse (gpt-5.4 via Emergent LLM key in backend/.env; scripted deterministic
   fallback). Mic button uses browser speech recognition (Vapi placeholder — env vars
   VITE_VAPI_PUBLIC_KEY/VITE_VAPI_ASSISTANT_ID in frontend/.env, empty by default).
   After ≥1 exchange: "Review Extracted Information" (POST `/api/ai/extract` → summary card)
   → "Confirm & Generate Assessment" (POST `/api/ai/assess` → result panel: RiskGauge,
   confidence, category, "Why this risk level?" weighted factors, department + reason,
   guidance, escalation alert). Demo scenarios use canned extractions/results that
   guarantee LOW(18/94)/MEDIUM(52/88)/HIGH(78/91)/CRITICAL(96/97).
3. **Human Review `/human-review`** — escalation queue, filter chips (All/Pending/Reviewed/
   Critical/High/Low Confidence), Review Case dialog + Mark Reviewed (PATCH
   `/api/human-review/{id}` → assessment.review_status="reviewed").
4. **Dashboard `/dashboard`** — 8 stat cards + 4 recharts (risk donut, 14-day trend area,
   department bar, review bar) from GET `/api/dashboard/stats` (live DB counts).
5. **Analytics `/analytics`** — confidence-by-department bar, volume line, dept load table,
   escalation-reason bar.
6. **Patients `/patients`** — search + risk/department filters over synthetic patients.
7. **Assessments `/assessments`** — history table; row click → `/assessments/{id}`
   report page (print button uses window.print + print CSS; Request Human Review;
   Start New Assessment).
8. **Departments `/departments`** — 12 dept cards with live assessment counts.
9. **Settings `/settings`** — AI engine status, editable thresholds (PUT `/api/settings`),
   n8n webhook URL + test event (POST `/api/webhooks/n8n/assessment`), Vapi config status.
   Status chips read GET `/api/settings/integrations`.

## Data model (Mongo, db "app"; relational-style, documented in README)
patients → assessments → assessment_symptoms → symptoms; assessments → human_reviews;
departments → doctors; conversations (chat sessions); settings (thresholds + webhook).

## Engine (backend/services/engine.py — deterministic, explainable)
score = severity (8/20/35) + 8×symptom count (cap 24) + 50 if emergency pattern + 12 sudden
onset + 10 worsening + 10 persistent(≥3 days) + age 60+/≤5 (8) / 50–59 (4) + 6×conditions
(cap 12). Emergency → CRITICAL (score ≥92) + escalation. Levels: <30 LOW, 30–59 MEDIUM,
60–84 HIGH, ≥85 CRITICAL (thresholds configurable via settings collection/env). Confidence:
50 + 8×symptoms (cap 30) + completeness (≤22) + 15 emergency − 10 ambiguity, clamp 45–98.
Escalation when HIGH/CRITICAL, confidence < 60, emergency indicators, or ≥3 body systems.

## Seed (backend/seed.py — `cd /app/backend && python seed.py`)
12 departments, 24 doctors, 26-symptom catalog, 40 patients (PT-1001…), 128 assessments
(AS-1001…; 54 LOW / 39 MEDIUM / 25 HIGH / 10 CRITICAL, spread over last 14 days), 21 human
reviews (7 pending). All synthetic demo data — clearly labelled.

## Integration status
- LLM: EMERGENT_LLM_KEY in backend/.env, model gpt-5.4, provider openai (working).
- Vapi: placeholder only (frontend/.env empty) — text chat + browser speech-to-text work.
- n8n: optional webhook endpoint works without n8n; configure URL in Settings.
