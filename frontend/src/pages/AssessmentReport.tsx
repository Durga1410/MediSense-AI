import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Printer,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { RiskBadge, RISK_COLORS } from "@/components/RiskBadge";
import { RiskGauge } from "@/components/RiskGauge";
import { apiGet, apiPost } from "@/lib/api";
import type { Assessment, RiskLevel } from "@/lib/types";

export default function AssessmentReport() {
  const { id } = useParams<{ id: string }>();
  const { data: a, isPending, isError } = useQuery({
    queryKey: ["assessment", id],
    queryFn: () => apiGet<Assessment>(`/assessments/${id}`),
    enabled: Boolean(id),
  });

  const requestReview = async () => {
    if (!a) return;
    try {
      await apiPost("/human-review", {
        assessment_id: a.id,
        reason: "Requested by patient/user after assessment",
      });
      toast.success("Human review case created - status: Pending.");
    } catch {
      toast.error("Could not create the review case - it may already exist.");
    }
  };

  if (isPending) {
    return <p className="text-sm text-slate-400">Loading report...</p>;
  }
  if (isError || !a) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="font-heading text-lg font-bold">Report not found</p>
        <p className="mt-1 text-sm text-slate-500">
          This assessment may not exist in the demo dataset.
        </p>
        <Link to="/assessments" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          <ArrowLeft className="size-4" />
          Back to Assessments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print-hide">
        <Link
          to="/assessments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700"
        >
          <ArrowLeft className="size-4" />
          All assessments
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link to="/assessment" className={buttonVariants({ variant: "outline" })} data-testid="report-start-new">
            Start New Assessment
          </Link>
          {a.review_status === "not_required" && (
            <Button variant="outline" onClick={requestReview} data-testid="report-request-review">
              <ShieldAlert className="size-4" />
              Request Human Review
            </Button>
          )}
          <Button onClick={() => window.print()} data-testid="report-print-button">
            <Printer className="size-4" />
            Print / Download Report
          </Button>
        </div>
      </div>

      <div className="print-area rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Stethoscope className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-xl font-bold tracking-tight">
                Preliminary Assessment Report
              </h2>
              <p className="font-mono text-xs text-slate-500" data-testid="report-code">
                {a.assessment_code} - {new Date(a.created_at).toLocaleString("en-US")}
              </p>
            </div>
          </div>
          <RiskBadge level={a.risk_level as RiskLevel} className="text-sm" />
        </div>

        {/* Patient info */}
        <Section title="Patient Information">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Field label="Patient" value={a.patient_name} />
            <Field label="Patient ID" value={a.patient_id.slice(0, 13)} mono />
            <Field label="Age" value={a.age != null ? String(a.age) : "unknown"} />
            <Field label="Gender" value={a.gender} />
          </div>
        </Section>

        {/* Symptoms */}
        <Section title="Symptoms">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Field label="Primary" value={a.primary_symptoms.join(", ") || "-"} />
            <Field label="Secondary" value={a.secondary_symptoms.join(", ") || "-"} />
            <Field label="Duration" value={a.duration} />
            <Field label="Severity" value={a.severity} />
            <Field label="Onset" value={a.onset} />
            <Field label="Existing conditions" value={a.existing_conditions.join(", ") || "None reported"} />
            <Field label="Medications" value={a.medications.join(", ") || "None reported"} />
            <Field label="Emergency indicators" value={a.emergency_indicators.join("; ") || "None detected"} />
          </div>
        </Section>

        {/* Assessment */}
        <Section title="Preliminary Assessment">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <RiskGauge level={a.risk_level as RiskLevel} score={a.risk_score} size={150} />
            <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
              <Field label="Risk Level" value={a.risk_level} />
              <Field label="Risk Score" value={`${a.risk_score} / 100`} />
              <Field label="AI Confidence" value={`${a.confidence}%`} />
              <Field label="Possible Health Category" value={a.possible_category} />
            </div>
          </div>
          {a.risk_level === "CRITICAL" && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3" role="alert">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
              <p className="text-sm font-semibold text-red-900">
                If you are experiencing a medical emergency, contact local emergency services or
                seek immediate medical care.
              </p>
            </div>
          )}
        </Section>

        {/* Why this risk */}
        <Section title="Why This Risk Level?">
          <ul className="space-y-2">
            {a.contributing_factors.map((f, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{f.factor}</p>
                  {f.detail && <p className="mt-0.5 text-xs text-slate-500">{f.detail}</p>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-bold ${
                    f.impact >= 30 ? "bg-red-50 text-red-700" : f.impact >= 10 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  +{f.impact}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Department + guidance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Section title="Recommended Department">
            <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                <Activity className="size-4" />
              </span>
              <div>
                <p className="font-heading text-base font-bold text-teal-900">{a.recommended_department}</p>
                <p className="mt-0.5 text-sm text-teal-900/80">{a.department_reason}</p>
              </div>
            </div>
          </Section>
          <Section title="Healthcare Guidance - Recommended Next Step">
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {a.guidance}
            </p>
          </Section>
        </div>

        {/* Human review */}
        <Section title="Human Review Status">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700" data-testid="report-review-status">
              {a.review_status === "not_required" && "No escalation - AI confidence and risk level within routine thresholds."}
              {a.review_status === "pending" && "Human Review Recommended - this case is pending clinician review."}
              {a.review_status === "reviewed" && "Reviewed by a clinician."}
            </p>
            {a.escalation_required && (
              <p className="mt-1 text-xs text-slate-500">Reason: {a.escalation_reason}</p>
            )}
          </div>
        </Section>

        {/* Transcript */}
        {a.transcript.length > 0 && (
          <Section title="Conversation Transcript">
            <div className="space-y-2 rounded-xl border border-slate-100 bg-white p-4">
              {a.transcript.map((m, i) => (
                <p key={i} className="text-xs leading-relaxed">
                  <span className={`mr-2 font-mono font-bold ${m.role === "user" ? "text-teal-700" : "text-slate-500"}`}>
                    {m.role === "user" ? "Patient" : "MediSense"}:
                  </span>
                  <span className="text-slate-600">{m.content}</span>
                </p>
              ))}
            </div>
          </Section>
        )}

        {/* Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <FileText className="size-4" />
            Disclaimer
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
            MediSense AI provides preliminary healthcare guidance and is not a replacement for a
            qualified medical professional. Risk levels and categories are preliminary statistical
            guidance, not a diagnosis. Engine: {a.ai_engine}. Synthetic demo data.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: RISK_COLORS[a.risk_level as RiskLevel] }}>
            Possible category: {a.possible_category} - not a confirmed diagnosis
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-6 last:border-0">
      <h3 className="font-heading text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-medium capitalize text-slate-800 ${mono ? "font-mono normal-case" : ""}`}>
        {value}
      </p>
    </div>
  );
}
