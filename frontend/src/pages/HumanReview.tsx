import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RiskBadge } from "@/components/RiskBadge";
import { apiGet, apiPatch } from "@/lib/api";
import type { HumanReview, RiskLevel } from "@/lib/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending Review" },
  { id: "reviewed", label: "Reviewed" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "low-confidence", label: "Low Confidence" },
];

export default function HumanReview() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<HumanReview | null>(null);
  const [notes, setNotes] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["human-reviews"],
    queryFn: () => apiGet<HumanReview[]>("/human-review"),
    refetchInterval: 30000,
  });

  const markReviewed = useMutation({
    mutationFn: (review: HumanReview) =>
      apiPatch<HumanReview>(`/human-review/${review.id}`, {
        status: "reviewed",
        reviewer_notes: notes || "Clinician confirmed AI risk classification.",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["human-reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Case marked as reviewed.");
      setActive(null);
      setNotes("");
    },
    onError: () => toast.error("Could not update the case - please try again."),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    switch (filter) {
      case "pending":
        return list.filter((r) => r.status === "pending");
      case "reviewed":
        return list.filter((r) => r.status === "reviewed");
      case "critical":
        return list.filter((r) => r.risk_level === "CRITICAL");
      case "high":
        return list.filter((r) => r.risk_level === "HIGH");
      case "low-confidence":
        return list.filter((r) => r.confidence < 60);
      default:
        return list;
    }
  }, [data, filter]);

  const pendingCount = (data ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Human Review Queue</h2>
          <p className="text-sm text-slate-500">
            Cases the AI escalated: high/critical risk, low confidence, emergency indicators or
            ambiguity. {pendingCount} pending.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <ShieldAlert className="size-3.5" />
          Demo data - synthetic cases
        </span>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="review-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] ${
              filter === f.id
                ? "border-teal-300 bg-teal-50 text-teal-800"
                : "border-slate-200 bg-white text-slate-600"
            }`}
            data-testid={`review-filter-${f.id}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
            data-testid={`review-card-${r.assessment_code}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <ClipboardCheck className="size-4" />
                </span>
                <div>
                  <p className="font-mono text-sm font-bold text-teal-700">{r.assessment_code}</p>
                  <p className="text-xs text-slate-500">
                    {r.patient_name} - {new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RiskBadge level={r.risk_level as RiskLevel} />
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    r.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {r.status === "pending" ? "Pending Human Review" : "Reviewed"}
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <p className="text-slate-700">
                <span className="font-semibold">Reason:</span> {r.reason}
              </p>
              <p className="text-slate-500">
                Confidence: <span className="font-mono font-semibold text-slate-800">{r.confidence}%</span>
                {r.reviewer_notes && r.status === "reviewed" && (
                  <>
                    {" "}- Notes: <span className="italic">{r.reviewer_notes}</span>
                  </>
                )}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setActive(r); setNotes(r.reviewer_notes); }} data-testid={`review-case-${r.assessment_code}`}>
                Review Case
              </Button>
              <Button
                size="sm"
                onClick={() => markReviewed.mutate(r)}
                disabled={r.status === "reviewed" || markReviewed.isPending}
                data-testid={`mark-reviewed-${r.assessment_code}`}
              >
                <CheckCircle2 className="size-4" />
                Mark Reviewed
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isPending && <p className="text-sm text-slate-400">Loading review queue...</p>}
      {!isPending && filtered.length === 0 && (
        <p className="text-sm text-slate-400" data-testid="reviews-empty">
          No cases match this filter.
        </p>
      )}

      {/* Case inspection dialog */}
      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        {active && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Review case {active.assessment_code}
              </DialogTitle>
              <DialogDescription>
                {active.patient_name} - risk {active.risk_level}, confidence {active.confidence}%
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                <span className="font-semibold">Escalation reason:</span> {active.reason}
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Clinician notes (optional)..."
                rows={4}
                data-testid="review-notes-input"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActive(null)}>
                Close
              </Button>
              <Button
                onClick={() => markReviewed.mutate(active)}
                disabled={markReviewed.isPending}
                data-testid="confirm-mark-reviewed"
              >
                Mark Reviewed
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
