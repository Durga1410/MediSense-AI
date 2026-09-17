import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet } from "@/lib/api";
import type { Assessment, DashboardStats, HumanReview } from "@/lib/types";

// Deeper analytics view for the "Analytics" nav entry - same live demo dataset.
export default function Analytics() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiGet<DashboardStats>("/dashboard/stats"),
    refetchInterval: 30000,
  });
  const { data: assessments } = useQuery({
    queryKey: ["assessments", "all"],
    queryFn: () => apiGet<Assessment[]>("/assessments?limit=200"),
  });
  const { data: reviews } = useQuery({
    queryKey: ["human-reviews"],
    queryFn: () => apiGet<HumanReview[]>("/human-review"),
  });

  const confidenceByDept = Object.values(
    (assessments ?? []).reduce<Record<string, { name: string; total: number; n: number }>>((acc, a) => {
      acc[a.recommended_department] ??= { name: a.recommended_department, total: 0, n: 0 };
      acc[a.recommended_department].total += a.confidence;
      acc[a.recommended_department].n += 1;
      return acc;
    }, {}),
  )
    .map((d) => ({ name: d.name, confidence: Math.round(d.total / d.n) }))
    .sort((a, b) => b.confidence - a.confidence);

  const deptTotals = Object.values(
    (assessments ?? []).reduce<Record<string, { name: string; count: number }>>((acc, a) => {
      acc[a.recommended_department] ??= { name: a.recommended_department, count: 0 };
      acc[a.recommended_department].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  const total = assessments?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-sm text-slate-500">Confidence, load and escalation analytics over the demo dataset.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <Info className="size-3.5" />
          Demo data - synthetic patients only
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Average AI Confidence by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72" data-testid="chart-confidence-by-dept">
              {confidenceByDept.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confidenceByDept} layout="vertical" margin={{ top: 0, right: 16, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "#334155" }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => [`${value}%`, "Avg confidence"]} />
                    <Bar dataKey="confidence" fill="#0D9488" radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Assessment Volume Trend (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72" data-testid="chart-volume-line">
              {stats && stats.trend.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip labelFormatter={(label: string) => `Date: ${label}`} formatter={(value: number) => [`${value} assessments`, "Volume"]} />
                    <Line type="monotone" dataKey="count" stroke="#0284C7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Department Load</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Assessments</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deptTotals.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-right font-mono">{d.count}</TableCell>
                    <TableCell className="text-right font-mono">
                      {total ? `${Math.round((d.count / total) * 100)}%` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Escalation Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56" data-testid="chart-escalation-reasons">
              {reviews && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(
                      reviews.reduce<Record<string, number>>((acc, r) => {
                        const key = (r.reason || "Requested").split(" - ")[0].split(" | ")[0].slice(0, 38);
                        acc[key] = (acc[key] ?? 0) + 1;
                        return acc;
                      }, {}),
                    )
                      .map(([name, count]) => ({ name, count }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 0, right: 12, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 10, fill: "#334155" }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => [`${value} cases`, "Escalations"]} />
                    <Bar dataKey="count" fill="#F43F5E" radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
