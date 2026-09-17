"""Pydantic v2 models for MediSense AI.

Every model here has a hand-written TS mirror in frontend/src/lib/types.ts — keep the
pairs in sync in the same edit (nothing infers across the Python/TypeScript boundary).
"""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    """Aware UTC now — stored aware so Pydantic serialises with an offset and JS parses it."""
    return datetime.now(timezone.utc)


def uuid_str() -> str:
    return str(uuid.uuid4())


# ---------- AI conversation ----------

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    created_at: datetime = Field(default_factory=utcnow)


class Conversation(BaseModel):
    id: str = Field(default_factory=uuid_str)
    messages: list[ChatMessage] = []
    scenario: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ChatTurnRequest(BaseModel):
    session_id: str | None = None
    message: str
    scenario: str | None = None


class ExtractRequest(BaseModel):
    session_id: str | None = None
    scenario: str | None = None


class AssessRequest(BaseModel):
    session_id: str | None = None
    scenario: str | None = None


# ---------- symptom extraction ----------

class ExtractedSummary(BaseModel):
    primary_symptoms: list[str] = []
    secondary_symptoms: list[str] = []
    duration: str = "unknown"
    severity: str = "unknown"  # mild | moderate | severe | unknown
    onset: str = "unknown"  # sudden | gradual | unknown
    age: int | None = None
    gender: str = "unknown"
    existing_conditions: list[str] = []
    medications: list[str] = []
    risk_factors: list[str] = []
    emergency_indicators: list[str] = []
    patient_name: str | None = None
    source: str = "rules"  # llm | rules | scenario


# ---------- assessment ----------

class ContributingFactor(BaseModel):
    factor: str
    impact: int
    detail: str = ""


class Assessment(BaseModel):
    id: str = Field(default_factory=uuid_str)
    assessment_code: str
    patient_id: str
    patient_name: str
    age: int | None = None
    gender: str = "unknown"
    primary_symptoms: list[str] = []
    secondary_symptoms: list[str] = []
    duration: str = "unknown"
    severity: str = "unknown"
    onset: str = "unknown"
    existing_conditions: list[str] = []
    medications: list[str] = []
    risk_factors: list[str] = []
    emergency_indicators: list[str] = []
    risk_level: str  # LOW | MEDIUM | HIGH | CRITICAL
    risk_score: int
    confidence: int
    possible_category: str
    contributing_factors: list[ContributingFactor] = []
    recommended_department: str
    department_reason: str = ""
    guidance: str
    escalation_required: bool = False
    escalation_reason: str = ""
    review_status: str = "not_required"  # not_required | pending | reviewed
    transcript: list[ChatMessage] = []
    ai_engine: str = "rule-based engine"
    scenario: str | None = None
    created_at: datetime = Field(default_factory=utcnow)


class AssessmentCreate(BaseModel):
    """REST surface for integrations (n8n / manual API) — runs the same engine."""

    patient_name: str = "Demo Patient"
    age: int | None = None
    gender: str = "unknown"
    primary_symptoms: list[str] = []
    secondary_symptoms: list[str] = []
    duration: str = "unknown"
    severity: str = "unknown"
    onset: str = "unknown"
    existing_conditions: list[str] = []
    medications: list[str] = []
    transcript: list[ChatMessage] = []


# ---------- patients ----------

class Patient(BaseModel):
    id: str = Field(default_factory=uuid_str)
    patient_code: str
    name: str
    age: int | None = None
    gender: str = "unknown"
    status: str = "Active"
    last_assessment: str | None = None  # ISO date of last assessment
    risk_level: str | None = None
    department: str | None = None
    created_at: datetime = Field(default_factory=utcnow)


class PatientCreate(BaseModel):
    name: str
    age: int | None = None
    gender: str = "unknown"


# ---------- departments ----------

class Department(BaseModel):
    id: str = Field(default_factory=uuid_str)
    name: str
    specialization: str = ""
    description: str = ""
    common_symptoms: list[str] = []
    assessment_count: int = 0
    doctor_count: int = 0


# ---------- human review ----------

class HumanReview(BaseModel):
    id: str = Field(default_factory=uuid_str)
    assessment_id: str
    assessment_code: str
    patient_id: str
    patient_name: str
    risk_level: str
    confidence: int
    reason: str
    status: str = "pending"  # pending | reviewed
    created_at: datetime = Field(default_factory=utcnow)
    reviewed_at: datetime | None = None
    reviewer_notes: str = ""


class HumanReviewCreate(BaseModel):
    assessment_id: str
    reason: str = "Requested by patient/user"


class HumanReviewUpdate(BaseModel):
    status: str  # "reviewed"
    reviewer_notes: str = ""


# ---------- dashboard ----------

class TrendPoint(BaseModel):
    date: str
    count: int


class DepartmentCount(BaseModel):
    name: str
    count: int


class DashboardStats(BaseModel):
    total_assessments: int
    low: int
    medium: int
    high: int
    critical: int
    human_reviews_total: int
    human_reviews_pending: int
    human_reviews_reviewed: int
    avg_confidence: float
    trend: list[TrendPoint] = []
    departments: list[DepartmentCount] = []
    demo_data: bool = True


# ---------- settings / integrations ----------

class Thresholds(BaseModel):
    medium_min: int = 30
    high_min: int = 60
    critical_min: int = 85
    confidence_review_threshold: int = 60


class AppSettings(BaseModel):
    thresholds: Thresholds = Field(default_factory=Thresholds)
    n8n_webhook_url: str = ""


class IntegrationStatus(BaseModel):
    n8n_connected: bool
    n8n_webhook_url: str
    n8n_endpoint: str = "/api/webhooks/n8n/assessment"
    ai_provider: str
    ai_model: str
    ai_available: bool
    thresholds: Thresholds


# ---------- n8n webhook ----------

class N8nWebhookRequest(BaseModel):
    assessment_id: str | None = None
    data: dict | None = None


class N8nWebhookResponse(BaseModel):
    received: bool
    workflow: str = "medisense-assessment"
    assessment_id: str | None = None
    actions: list[str] = []
    forwarded_at: datetime = Field(default_factory=utcnow)
