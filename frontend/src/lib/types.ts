// Hand-written mirrors of backend/models/schemas.py — nothing infers across the
// Python boundary, so keep every pair in sync in the same edit as the model change.

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  scenario: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributingFactor {
  factor: string;
  impact: number;
  detail: string;
}

export interface ExtractedSummary {
  primary_symptoms: string[];
  secondary_symptoms: string[];
  duration: string;
  severity: string;
  onset: string;
  age: number | null;
  gender: string;
  existing_conditions: string[];
  medications: string[];
  risk_factors: string[];
  emergency_indicators: string[];
  patient_name: string | null;
  source: string; // "llm" | "rules" | "scenario"
}

export interface Assessment {
  id: string;
  assessment_code: string;
  patient_id: string;
  patient_name: string;
  age: number | null;
  gender: string;
  primary_symptoms: string[];
  secondary_symptoms: string[];
  duration: string;
  severity: string;
  onset: string;
  existing_conditions: string[];
  medications: string[];
  risk_factors: string[];
  emergency_indicators: string[];
  risk_level: RiskLevel;
  risk_score: number;
  confidence: number;
  possible_category: string;
  contributing_factors: ContributingFactor[];
  recommended_department: string;
  department_reason: string;
  guidance: string;
  escalation_required: boolean;
  escalation_reason: string;
  review_status: string; // not_required | pending | reviewed
  transcript: ChatMessage[];
  ai_engine: string;
  scenario: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  patient_code: string;
  name: string;
  age: number | null;
  gender: string;
  status: string;
  last_assessment: string | null;
  risk_level: RiskLevel | null;
  department: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  specialization: string;
  description: string;
  common_symptoms: string[];
  assessment_count: number;
  doctor_count: number;
}

export interface HumanReview {
  id: string;
  assessment_id: string;
  assessment_code: string;
  patient_id: string;
  patient_name: string;
  risk_level: RiskLevel;
  confidence: number;
  reason: string;
  status: string; // pending | reviewed
  created_at: string;
  reviewed_at: string | null;
  reviewer_notes: string;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface DepartmentCount {
  name: string;
  count: number;
}

export interface DashboardStats {
  total_assessments: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
  human_reviews_total: number;
  human_reviews_pending: number;
  human_reviews_reviewed: number;
  avg_confidence: number;
  trend: TrendPoint[];
  departments: DepartmentCount[];
  demo_data: boolean;
}

export interface Thresholds {
  medium_min: number;
  high_min: number;
  critical_min: number;
  confidence_review_threshold: number;
}

export interface AppSettings {
  thresholds: Thresholds;
  n8n_webhook_url: string;
}

export interface IntegrationStatus {
  n8n_connected: boolean;
  n8n_webhook_url: string;
  n8n_endpoint: string;
  ai_provider: string;
  ai_model: string;
  ai_available: boolean;
  thresholds: Thresholds;
}

export interface N8nWebhookResponse {
  received: boolean;
  workflow: string;
  assessment_id: string | null;
  actions: string[];
  forwarded_at: string;
}

// SSE chat stream terminal event (POST /api/ai/chat/stream)
export interface StreamDonePayload {
  type: "done";
  session_id: string;
  message: { role: string; content: string };
}
