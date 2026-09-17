# MediSense AI

**AI-Powered Medical Assistant for Preliminary Assessment & Healthcare Guidance**
*Hackathon Problem Statement HC-02*

> **Understand. Assess. Guide.**

MediSense AI lets a patient describe symptoms by **text or voice**, asks relevant follow-up
questions one at a time, extracts structured symptom information, and produces a
**preliminary assessment**: risk level (LOW / MEDIUM / HIGH / CRITICAL), a 0–100 risk score,
an AI confidence score, a *possible health category* (never a "confirmed diagnosis"), an
**explainable** breakdown of the factors behind the risk, a recommended healthcare
department, and safe healthcare guidance. Uncertain, urgent or low-confidence cases are
**escalated to a Human Review queue**.

> ⚠️ **Important:** MediSense AI provides *preliminary healthcare guidance* and is **not a
> replacement for a qualified medical professional**. If you are experiencing a medical
> emergency, contact local emergency services or seek immediate medical care.

---

## Problem

Patients often struggle to describe symptoms, judge urgency, and find the right care
pathway. Triage front-lines need tools that are fast, explainable, and safe: they must
recognise emergency patterns, quantify uncertainty, and hand uncertain cases to humans
rather than guessing.

## Solution

A conversational AI assistant + clinical dashboard:

```
Patient describes symptoms (text / voice)
   → AI asks follow-up questions (one at a time)
   → Symptom extraction (LLM, deterministic fallback)
   → Preliminary assessment (risk level, score, confidence, category)
   → Explainable risk ("Why this risk level?" with weighted factors)
   → Department recommendation (with reason)
   → Healthcare guidance (safe next step)
   → Human-in-the-loop escalation when needed
   → Dashboard, analytics & printable report
```

## Features

- **Conversational triage** — streaming LLM chat (OpenAI GPT via the Emergent LLM key) that
  asks one question at a time; degrades to a deterministic scripted conversation when the AI
  is unavailable.
- **Symptom extraction** — structured summary card (primary/secondary symptoms, duration,
  severity, onset, age, gender, conditions, medications, emergency indicators) shown
  *before* the assessment is generated.
- **Assessment engine** — deterministic, transparent keyword/weight scoring with
  configurable thresholds; emergency patterns force CRITICAL + escalation.
- **Explainable risk** — "Why this risk level?" panel with weighted contributing factors.
- **Human-in-the-loop** — automatic escalation (HIGH/CRITICAL risk, low confidence,
  emergency indicators, ambiguity) + manual "Request Human Review"; review queue with
  filters and Mark Reviewed workflow.
- **Department recommendation** — explainable routing across 12 departments.
- **Voice-ready** — browser speech-to-text mic button today; Vapi integration placeholder
  (env-driven, never hard-coded keys). Text chat always works.
- **n8n-ready** — optional webhook endpoint + outbound notification when assessments are
  created; the core app never depends on n8n.
- **Dashboards** — stat cards + Risk Distribution, Assessment Trends, Department
  Recommendations and Human Review charts (all clearly labelled demo data).
- **Printable report** — every assessment has a polished print/PDF-ready report page.
- **Demo mode** — 4 one-click scenarios (LOW/MEDIUM/HIGH/CRITICAL) + 128 synthetic
  assessments, 40 synthetic patients, 21 review cases.

## Architecture

```
├── frontend/            Vite + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui + recharts
│   └── src/
│       ├── pages/       Landing, Assessment, Dashboard, Analytics, Patients, Assessments,
│       │                AssessmentReport, HumanReview, Departments, Settings
│       ├── components/  AppShell (sidebar/topbar), RiskBadge, RiskGauge, StatCard, EmergencyBanner
│       └── lib/         api.ts (typed fetch + SSE streaming), types.ts (TS mirrors of the API models)
├── backend/             FastAPI (async) + Pydantic v2 + motor (MongoDB)
│   ├── routers/         ai, assessments, patients, departments, reviews, dashboard, webhooks, settings
│   ├── services/        engine.py (deterministic scoring), llm.py (LLM chat/extraction), records.py
│   ├── models/          Pydantic v2 request/response schemas
│   └── seed.py          Synthetic demo data generator
└── tests/               Playwright e2e workspace
```

## Tech Stack

- **Frontend:** Vite, React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui (base-nova),
  TanStack Query, motion, recharts, sonner.
- **Backend:** FastAPI (fully async), Pydantic v2, motor (async MongoDB), emergentintegrations
  (LLM), httpx.
- **Database:** MongoDB (document store holding a clearly-documented relational-style schema —
  see below). The platform runs MongoDB in-pod; the schema keeps relational discipline:
  `patients → assessments → assessment_symptoms → symptoms`, `assessments → departments`,
  `assessments → human_reviews`, `departments → doctors`.
- **AI:** hybrid engine — LLM conversation/extraction (OpenAI GPT-5.4 via the Emergent
  universal key, server-side only) + deterministic rule-based scoring and safe fallbacks.

## Database schema (MongoDB collections)

| Collection | Purpose |
|---|---|
| `patients` | Synthetic patients (patient_code, name, age, gender, last assessment snapshot) |
| `assessments` | Full assessment record: symptoms, risk, confidence, category, factors, department, guidance, review status, transcript |
| `symptoms` | Symptom catalog (category, red-flag flag) |
| `assessment_symptoms` | Link table: assessment ↔ symptom name |
| `departments` | 12 departments with specialization + common symptom categories |
| `doctors` | Demo roster per department |
| `human_reviews` | Escalation cases (one per assessment, unique index) |
| `conversations` | Chat transcripts per session |
| `settings` | Runtime-configurable thresholds + n8n webhook URL |

## AI workflow

1. **Conversation** (`POST /api/ai/chat/stream`, SSE): the LLM plays a triage nurse with a
   strict safety system prompt; emergency-pattern messages get a deterministic urgent-care
   reply; failures fall back to a scripted question flow.
2. **Extraction** (`POST /api/ai/extract`): LLM returns strict JSON symptom structure;
   deterministic keyword extractor is the fallback.
3. **Scoring** (`POST /api/ai/assess`): the deterministic engine computes risk score from
   severity, red flags, emergency patterns, onset, duration, age, history — every point is
   returned as an explainable factor. Confidence reflects symptom matching + data
   completeness − ambiguity. Thresholds are configurable at runtime.
4. **Escalation & records**: escalated cases open a human-review entry; the patient record
   is updated; the optional n8n webhook fires (fire-and-forget).

## Vapi integration (placeholder)

Frontend env vars (placeholders, never hard-coded keys):

```
VITE_VAPI_PUBLIC_KEY=
VITE_VAPI_ASSISTANT_ID=
```

Voice flow when connected: patient speaks → Vapi → MediSense AI conversation → backend
assessment → voice/text response. Until credentials are provided, the mic button uses the
browser's built-in speech recognition (where available) and text chat works fully. The
Settings page shows a clearly-marked configuration section.

## n8n integration (optional)

- Outbound: when configured, new assessments POST to the configured webhook URL.
- Inbound: `POST /api/webhooks/n8n/assessment` accepts `{assessment_id}` and returns the
  simulated workflow actions (`risk_classified`, `human_review_notification_queued`,
  `audit_report_generated`).
- Configure and test from **Settings**; the app never requires n8n to run.

## Safety considerations

- Preliminary guidance only — never a diagnosis, never medication advice.
- Mandatory disclaimers + emergency notice on the landing page, chat and reports.
- Deterministic emergency-pattern detection overrides the LLM (urgent reply + CRITICAL).
- Explainability: every risk level shows its weighted contributing factors.
- Human-in-the-loop escalation for high/critical risk, low confidence, and ambiguity.
- Synthetic demo data only; confidence and thresholds are visible and configurable.

## Setup instructions

```bash
# backend (MongoDB must be reachable; see backend/.env)
cd backend
python -m pip install -r requirements.txt
python seed.py                 # one-time: synthetic demo data
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# frontend
cd frontend
yarn
yarn dev                       # http://localhost:3000 (proxies /api → :8001)
```

## Environment variables

`backend/.env` (server-side; never committed):

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=app
CORS_ORIGINS=*
EMERGENT_LLM_KEY=            # Emergent universal LLM key (server-side only)
AI_PROVIDER=openai
AI_MODEL=gpt-5.4
RISK_MEDIUM_MIN=30
RISK_HIGH_MIN=60
RISK_CRITICAL_MIN=85
CONFIDENCE_REVIEW_THRESHOLD=60
```

See `.env.example` at the repo root for the full template.

## API summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ai/chat/stream` | SSE triage conversation turn |
| POST | `/api/ai/extract` | Structured symptom extraction |
| POST | `/api/ai/assess` | Run the preliminary assessment engine |
| POST/GET | `/api/assessments`, `/api/assessments/{id}` | Assessment CRUD |
| POST/GET | `/api/patients` | Patient directory |
| GET | `/api/departments` | Departments + live assessment counts |
| GET/POST/PATCH | `/api/human-review` | Human review queue |
| GET | `/api/dashboard/stats` | Dashboard aggregates |
| POST | `/api/webhooks/n8n/assessment` | Optional n8n webhook surface |
| GET/PUT | `/api/settings` | Thresholds + integrations |

## Screenshots

Capture from the running app:

- Landing page with hero, scenario quick-launch and emergency notice (`/`)
- Conversational assessment with extraction card and risk gauge (`/assessment`)
- Triage dashboard with charts (`/dashboard`)
- Human review queue (`/human-review`)
- Printable assessment report (`/assessments/{id}`)

## Demo instructions

1. Open the app → landing page shows the product story; use **Start Assessment**.
2. Chat naturally, or click a **demo scenario** chip (Mild Headache → LOW, Persistent Fever →
   MEDIUM, Breathing Difficulty → HIGH, Chest Discomfort → CRITICAL).
3. Select **Review Extracted Information** → confirm the summary card → **Confirm &
   Generate Assessment**.
4. Observe the risk gauge, confidence, "Why this risk level?" factors, department
   recommendation and guidance; CRITICAL cases surface an emergency call-to-action.
5. Escalated cases appear in **Human Review** — review and mark them.
6. Explore **Dashboard**, **Analytics**, **Patients**, **Assessments** (click a row for the
   printable report) and **Settings** (thresholds, n8n webhook test, Vapi placeholder).

## Future scope

- Real Vapi voice calls with turn-taking and spoken assessment summaries.
- Actual n8n workflow templates (SMS/PagerDuty escalation, audit archiving).
- Clinician authentication + audit trails; real EHR integration (HL7/FHIR).
- Multi-language triage and accessibility refinements; model evaluation harness for
  threshold tuning against labelled triage data.
