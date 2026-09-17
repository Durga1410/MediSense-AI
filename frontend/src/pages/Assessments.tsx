import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/RiskBadge";
import { apiGet } from "@/lib/api";
import type { Assessment, RiskLevel } from "@/lib/types";

const REVIEW_LABELS: Record<string, string> = {
  not_required: "Not required",
  pending: "Pending review",
  reviewed: "Reviewed",
};

export default function Assessments() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");

  const { data, isPending } = useQuery({
    queryKey: ["assessments", "list"],
    queryFn: () => apiGet<Assessment[]>("/assessments?limit=200"),
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.assessment_code.toLowerCase().includes(needle) ||
          a.patient_id.toLowerCase().includes(needle) ||
          a.patient_name.toLowerCase().includes(needle),
      );
    }
    if (risk !== "all") list = list.filter((a) => a.risk_level === risk);
    if (reviewStatus !== "all") list = list.filter((a) => a.review_status === reviewStatus);
    return list;
  }, [data, q, risk, reviewStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Assessments</h2>
        <p className="text-sm text-slate-500">
          Assessment history - click a row to open the detailed report.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by assessment ID, patient ID or name..."
            className="pl-9"
            data-testid="assessments-search-input"
          />
        </div>
        <Select value={risk} onValueChange={(value: string) => setRisk(value)}>
          <SelectTrigger className="w-full sm:w-44" data-testid="assessments-risk-filter">
            <SelectValue>{(v: string) => (v === "all" ? "All risk levels" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk levels</SelectItem>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reviewStatus} onValueChange={(value: string) => setReviewStatus(value)}>
          <SelectTrigger className="w-full sm:w-48" data-testid="assessments-review-filter">
            <SelectValue>
              {(v: string) => (v === "all" ? "All review statuses" : (REVIEW_LABELS[v] ?? v))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All review statuses</SelectItem>
            <SelectItem value="not_required">Not required</SelectItem>
            <SelectItem value="pending">Pending review</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assessment ID</TableHead>
              <TableHead>Patient ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Review Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow
                key={a.id}
                onClick={() => navigate(`/assessments/${a.id}`)}
                className="cursor-pointer"
                data-testid={`assessment-row-${a.assessment_code}`}
              >
                <TableCell className="font-mono text-xs font-semibold text-teal-700">{a.assessment_code}</TableCell>
                <TableCell className="font-mono text-xs">{a.patient_id.slice(0, 8)}...</TableCell>
                <TableCell className="font-mono text-xs">
                  {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </TableCell>
                <TableCell>
                  <RiskBadge level={a.risk_level as RiskLevel} />
                </TableCell>
                <TableCell className="font-mono">{a.confidence}%</TableCell>
                <TableCell>{a.recommended_department}</TableCell>
                <TableCell className="text-xs font-medium text-slate-600">
                  {REVIEW_LABELS[a.review_status] ?? a.review_status}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {isPending && <p className="px-4 pb-4 text-sm text-slate-400">Loading assessments...</p>}
        {!isPending && filtered.length === 0 && (
          <p className="px-4 pb-4 text-sm text-slate-400" data-testid="assessments-empty">
            No assessments match the current filters.
          </p>
        )}
      </div>
    </div>
  );
}
