import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  ClipboardList,
  FileText,
  Mic,
  MicOff,
  PhoneCall,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { RiskBadge, RISK_COLORS } from "@/components/RiskBadge";
import { RiskGauge } from "@/components/RiskGauge";
import { apiPost, apiStreamPost } from "@/lib/api";
import type {
  Assessment,
  ChatMessage,
  ExtractedSummary,
  RiskLevel,
  StreamDonePayload,
} from "@/lib/types";

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi, I'm MediSense AI. What symptoms are you experiencing?",
  created_at: new Date().toISOString(),
};

const DEMO_SCENARIOS: { id: string; level: RiskLevel; label: string; message: string }[] = [
  {
    id: "low",
    level: "LOW",
    label: "Mild Tension Headache",
    message:
      "I've had a dull aching headache on both sides of my head since yesterday afternoon after working at my computer.",
  },
  {
    id: "medium",
    level: "MEDIUM",
    label: "Persistent Fever & Fatigue",
    message:
      "I've had a fever for 4 days now, with severe body aches, dry cough, and fatigue that makes it hard to get out of bed.",
  },
  {
    id: "high",
    level: "HIGH",
    label: "Acute Breathing Difficulty",
    message:
      "I am experiencing sudden shortness of breath when walking short distances, wheezing, and a tight sensation across my upper chest that started 3 hours ago.",
  },
  {
    id: "critical",
    level: "CRITICAL",
    label: "Chest Discomfort & Breathlessness",
    message:
      "Severe crushing pressure in the center of my chest radiating to my left jaw and shoulder, sweating heavily, feeling dizzy and short of breath.",
  },
];

type VoiceStatus = "idle" | "listening" | "unsupported";

export default function Assessment() {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedSummary | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [vapiConfigured, setVapiConfigured] = useState(
    () => Boolean(import.meta.env.VITE_VAPI_PUBLIC_KEY && import.meta.env.VITE_VAPI_ASSISTANT_ID),
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoRanRef = useRef(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamText]);

  const send = async (text: string, scenarioId?: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming || assessing) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: trimmed, created_at: new Date().toISOString() },
    ]);
    setInput("");
    setStreaming(true);
    setStreamText("");
    try {
      const done = await apiStreamPost<StreamDonePayload>(
        "/ai/chat/stream",
        {
          session_id: sessionId ?? undefined,
          message: trimmed,
          scenario: scenarioId ?? scenario ?? undefined,
        },
        (delta) => setStreamText((t) => t + delta),
      );
      if (done?.session_id) setSessionId(done.session_id);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: done?.message.content ?? "I'm here whenever you're ready.",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      toast.error("Could not reach MediSense AI - please try again.");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamText("");
    }
  };

  // One-click demo scenarios (?scenario=low|medium|high|critical)
  useEffect(() => {
    const scenarioId = searchParams.get("scenario");
    if (!scenarioId || autoRanRef.current) return;
    const found = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!found) return;
    autoRanRef.current = true;
    setScenario(found.id);
    void send(found.message, found.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runScenario = (id: string) => {
    const found = DEMO_SCENARIOS.find((s) => s.id === id);
    if (!found || streaming || assessing) return;
    setScenario(found.id);
    setExtracted(null);
    setAssessment(null);
    setSessionId(null);
    setMessages([GREETING]);
    autoRanRef.current = true;
    window.setTimeout(() => void send(found.message, found.id), 50);
  };

  const reset = () => {
    setSessionId(null);
    setScenario(null);
    setMessages([GREETING]);
    setExtracted(null);
    setAssessment(null);
    setInput("");
    autoRanRef.current = false;
  };

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const ex = await apiPost<ExtractedSummary>("/ai/extract", {
        session_id: sessionId,
        scenario,
      });
      setExtracted(ex);
    } catch {
      toast.error("Could not extract symptom information yet - answer one more question and try again.");
    } finally {
      setExtracting(false);
    }
  };

  const handleAssess = async () => {
    setAssessing(true);
    try {
      const a = await apiPost<Assessment>("/ai/assess", { session_id: sessionId, scenario });
      setAssessment(a);
      if (a.risk_level === "CRITICAL") {
        toast.error("Critical risk indicators - emergency care recommended.", { duration: 6000 });
      } else {
        toast.success("Preliminary assessment ready.");
      }
    } catch {
      toast.error("Assessment failed - please try again.");
    } finally {
      setAssessing(false);
    }
  };

  const requestReview = async () => {
    if (!assessment) return;
    try {
      await apiPost("/human-review", {
        assessment_id: assessment.id,
        reason: "Requested by patient/user after assessment",
      });
      setAssessment({ ...assessment, review_status: "pending", escalation_required: true });
      toast.success("Human review case created - status: Pending.");
    } catch {
      toast.error("Could not create the review case - it may already exist.");
    }
  };

  const toggleMic = () => {
    if (voiceStatus === "listening") {
      recognitionRef.current?.stop();
      setVoiceStatus("idle");
      return;
    }
    const SR =
      (window as unknown as { SpeechRecognition?: new () => never; webkitSpeechRecognition?: new () => never })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => never }).webkitSpeechRecognition;
    if (!SR) {
      setVoiceStatus("unsupported");
      toast.info(
        "Voice input isn't available in this browser. Text chat works fully - Vapi voice can be connected later via Settings.",
      );
      return;
    }
    const rec = new SR() as unknown as {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void;
      onerror: () => void;
      start: () => void;
      stop: () => void;
    };
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setInput(text);
    };
    rec.onend = () => setVoiceStatus("idle");
    rec.onerror = () => setVoiceStatus("idle");
    recognitionRef.current = rec;
    rec.start();
    setVoiceStatus("listening");
  };

  const canExtract = messages.length >= 3 && !streaming;

  return (
    <div className="space-y-6">
      <EmergencyBanner />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Chat column */}
        <section className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-teal-600 text-white">
                  <Bot className="size-5" />
                </span>
                <div>
                  <p className="font-heading text-sm font-bold">MediSense AI Assistant</p>
                  <p className="text-xs text-slate-500">
                    Preliminary triage conversation - one question at a time
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                data-testid="clear-conversation-button"
              >
                <RotateCcw className="size-4" />
                Clear conversation
              </Button>
            </div>

            {/* Demo scenarios */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Demo scenarios:
              </span>
              {DEMO_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => runScenario(s.id)}
                  disabled={streaming || assessing}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${
                    scenario === s.id
                      ? "border-teal-300 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                  data-testid={`demo-scenario-${s.id}`}
                >
                  <span className="size-2 rounded-full" style={{ background: RISK_COLORS[s.level] }} />
                  {s.label}
                </button>
              ))}
            </div>

            {/* Conversation */}
            <div
              className="h-[440px] space-y-4 overflow-y-auto px-5 py-5"
              data-testid="chat-message-list"
            >
              {messages.map((m, i) => (
                <motion.div
                  key={`${m.created_at}-${i}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      m.role === "user" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                  </span>
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-tr-sm bg-teal-600 text-white"
                        : "rounded-tl-sm border border-slate-100 bg-slate-50 text-slate-800"
                    }`}
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {streaming && (
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Bot className="size-4" />
                  </span>
                  <div className="max-w-[78%] rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm leading-relaxed text-slate-800">
                    {streamText || <span className="inline-block animate-pulse">MediSense is typing...</span>}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void send(input);
                  }}
                  placeholder="Describe your symptoms..."
                  className="flex-1"
                  disabled={streaming || assessing}
                  data-testid="chat-input"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMic}
                  aria-label="Toggle voice input"
                  data-testid="mic-button"
                  className={voiceStatus === "listening" ? "border-teal-300 bg-teal-50 text-teal-700" : ""}
                >
                  {voiceStatus === "listening" ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Button
                  onClick={() => void send(input)}
                  disabled={streaming || assessing || !input.trim()}
                  data-testid="send-message-button"
                >
                  <Send className="size-4" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span data-testid="voice-status">
                  {voiceStatus === "listening"
                    ? "Listening... speak now"
                    : voiceStatus === "unsupported"
                      ? "Voice unavailable in this browser - text chat active"
                      : "Text chat active" + (vapiConfigured ? " - Vapi voice configured" : " - Vapi voice placeholder (connect in Settings)")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldAlert className="size-3.5 text-amber-600" />
                  Preliminary guidance only - not a diagnosis
                </span>
              </div>
            </div>
          </div>

          {assessment && (
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={reset} data-testid="start-new-assessment">
                <Plus className="size-4" />
                Start New Assessment
              </Button>
              <Link
                to={`/assessments/${assessment.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                data-testid="view-full-report"
              >
                <FileText className="size-4" />
                View Full Report
              </Link>
            </div>
          )}
        </section>

        {/* Right rail: extraction + result */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:col-span-5">
          {!assessment && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-teal-600" />
                <p className="font-heading text-sm font-bold">Extracted symptom summary</p>
              </div>
              {!extracted ? (
                <>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    After a couple of questions, MediSense extracts the structured details below and
                    shows them here <span className="font-medium">before</span> generating the
                    assessment.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-500">
                    {["Primary & secondary symptoms", "Duration, severity, onset", "Age, gender, conditions", "Emergency indicators"].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-teal-400" /> {t}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-4 w-full"
                    onClick={handleExtract}
                    disabled={!canExtract || extracting}
                    data-testid="extract-symptoms-button"
                  >
                    <Sparkles className="size-4" />
                    {extracting ? "Extracting..." : "Review Extracted Information"}
                  </Button>
                  {!canExtract && (
                    <p className="mt-2 text-xs text-slate-400">
                      Answer at least one question first (or run a demo scenario).
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-4" data-testid="extracted-summary-card">
                  <div className="space-y-3">
                    <SummaryRow label="Primary symptoms" value={extracted.primary_symptoms.join(", ") || "None captured"} />
                    <SummaryRow label="Secondary symptoms" value={extracted.secondary_symptoms.join(", ") || "None"} />
                    <div className="grid grid-cols-2 gap-3">
                      <SummaryRow label="Duration" value={extracted.duration} />
                      <SummaryRow label="Severity" value={extracted.severity} />
                      <SummaryRow label="Onset" value={extracted.onset} />
                      <SummaryRow label="Age / Gender" value={`${extracted.age ?? "?"} / ${extracted.gender}`} />
                    </div>
                    <SummaryRow label="Existing conditions" value={extracted.existing_conditions.join(", ") || "None reported"} />
                    {extracted.medications.length > 0 && (
                      <SummaryRow label="Medications" value={extracted.medications.join(", ")} />
                    )}
                    {extracted.emergency_indicators.length > 0 && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                        Emergency indicators: {extracted.emergency_indicators.join("; ")}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400">
                      Extraction source: {extracted.source === "llm" ? "AI (LLM)" : extracted.source}
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleAssess}
                      disabled={assessing}
                      data-testid="generate-assessment-button"
                    >
                      <Stethoscope className="size-4" />
                      {assessing ? "Assessing..." : "Confirm & Generate Assessment"}
                    </Button>
                    <Button variant="outline" onClick={() => setExtracted(null)} data-testid="back-to-chat-button">
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {assessment && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
              data-testid="assessment-result-panel"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between">
                  <p className="font-heading text-sm font-bold">Preliminary Assessment</p>
                  <RiskBadge level={assessment.risk_level} />
                </div>
                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  <RiskGauge level={assessment.risk_level} score={assessment.risk_score} size={150} />
                  <div className="flex-1 space-y-2 text-sm">
                    <ResultRow label="AI Confidence" value={`${assessment.confidence}%`} testId="result-confidence" />
                    <ResultRow label="Possible Health Category" value={assessment.possible_category} testId="result-category" />
                    <ResultRow label="Assessment ID" value={assessment.assessment_code} mono testId="result-assessment-id" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <p className="font-heading text-sm font-bold">Why this risk level?</p>
                <ul className="mt-3 space-y-2" data-testid="risk-factors-list">
                  {assessment.contributing_factors.map((f, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{f.factor}</p>
                        {f.detail && <p className="mt-0.5 text-xs text-slate-500">{f.detail}</p>}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-bold ${
                          f.impact >= 30
                            ? "bg-red-50 text-red-700"
                            : f.impact >= 10
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        +{f.impact}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-teal-700" />
                  <p className="font-heading text-sm font-bold text-teal-900">Recommended Department</p>
                </div>
                <p className="mt-2 font-heading text-lg font-bold text-teal-800" data-testid="result-department">
                  {assessment.recommended_department}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-teal-900/80">{assessment.department_reason}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <p className="font-heading text-sm font-bold">Recommended Next Step</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700" data-testid="result-guidance">
                  {assessment.guidance}
                </p>
              </div>

              {(assessment.escalation_required || assessment.review_status !== "not_required") && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5" data-testid="human-review-alert">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-4 text-amber-700" />
                    <p className="font-heading text-sm font-bold text-amber-900">Human Review Recommended</p>
                  </div>
                  <p className="mt-2 text-sm text-amber-900/90">
                    <span className="font-semibold">Reason:</span> {assessment.escalation_reason || "Requested by patient/user"}
                  </p>
                  <p className="mt-1 text-sm text-amber-900/90">
                    <span className="font-semibold">Status:</span>{" "}
                    {assessment.review_status === "reviewed" ? "Reviewed by clinician" : "Pending Human Review"}
                  </p>
                  {assessment.risk_level === "CRITICAL" && (
                    <a
                      href="tel:911"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                      data-testid="call-emergency-button"
                    >
                      <PhoneCall className="size-4" />
                      Call Emergency Services Now
                    </a>
                  )}
                </div>
              )}

              {!assessment.escalation_required && assessment.review_status === "not_required" && (
                <Button variant="outline" className="w-full" onClick={requestReview} data-testid="request-human-review">
                  <ShieldAlert className="size-4" />
                  Request Human Review
                </Button>
              )}

              <p className="px-1 text-[11px] leading-relaxed text-slate-400">
                MediSense AI provides preliminary healthcare guidance and is not a replacement for a
                qualified medical professional. Engine: {assessment.ai_engine}.
              </p>
            </motion.div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium capitalize text-slate-800">{value}</p>
    </div>
  );
}

function ResultRow({
  label,
  value,
  mono = false,
  testId,
}: {
  label: string;
  value: string;
  mono?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-0">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className={`${mono ? "font-mono" : "font-heading"} text-sm font-bold text-slate-900`} data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
