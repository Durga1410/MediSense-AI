import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Gauge,
  Info,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { RISK_COLORS } from "@/components/RiskBadge";
import { apiGet } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";

const fetchStats = () => apiGet<DashboardStats>("/dashboard/stats");

export default function Dashboard() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  const riskData = data
    ? [
        { name: "Low", value: data.low },
        { name: "Medium", value: data.medium },
        { name: "High", value: data.high },
        { name: "Critical", value: data.critical },
      ].filter((d) => d.value > 0)
    : [];
  const riskColorMap: Record<string, string> = {
    Low: RISK_COLORS.LOW,
    Medium: RISK_COLORS.MEDIUM,
    High: RISK_COLORS.HIGH,
    Critical: RISK_COLORS.CRITICAL,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Triage Command Center</h2>
          <p className="text-sm text-slate-500">
            Preliminary assessment statistics across the demo dataset.
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
          data-testid="demo-data-badge"
        >
          <Info className="size-3.5" />
          Demo data - synthetic patients only
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Assessments" value={data?.total_assessments ?? "-"} icon={Activity} tone="primary" testId="stat-total-assessments" />
        <StatCard label="Low Risk" value={data?.low ?? "-"} icon={ShieldCheck} tone="low" testId="stat-low-risk" />
        <StatCard label="Medium Risk" value={data?.medium ?? "-"} icon={AlertTriangle} tone="medium" testId="stat-medium-risk" />
        <StatCard label="High Risk" value={data?.high ?? "-"} icon={ShieldAlert} tone="high" testId="stat-high-risk" />
        <StatCard label="Critical" value={data?.critical ?? "-"} icon={AlertOctagon} tone="critical" testId="stat-critical-risk" />
        <StatCard label="Human Reviews" value={data?.human_reviews_total ?? "-"} icon={UserCheck} testId="stat-human-reviews" />
        <StatCard label="Pending Reviews" value={data?.human_reviews_pending ?? "-"} icon={ShieldAlert} tone="medium" testId="stat-pending-reviews" />
        <StatCard label="Avg AI Confidence" value={data ? `${data.avg_confidence}%` : "-"} icon={Gauge} tone="primary" testId="stat-avg-confidence" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52" data-testid="chart-risk-distribution">
              {riskData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {riskData.map((entry) => (
                        <Cell key={entry.name} fill={riskColorMap[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} assessments`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-3">
              {riskData.map((d) => (
                <span key={d.name} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <span className="size-2.5 rounded-full" style={{ background: riskColorMap[d.name] }} />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Assessment Trends (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" data-testid="chart-assessment-trends">
              {data && data.trend.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0D9488" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0D9488" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => v.slice(5)}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip labelFormatter={(label: string) => `Date: ${label}`} formatter={(value: number) => [`${value} assessments`, "Volume"]} />
                    <Area type="monotone" dataKey="count" stroke="#0D9488" strokeWidth={2} fill="url(#trendFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Department Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" data-testid="chart-departments">
              {data && data.departments.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.departments} layout="vertical" margin={{ top: 0, right: 12, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 11, fill: "#334155" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip formatter={(value: number) => [`${value} assessments`, "Recommended"]} />
                    <Bar dataKey="count" fill="#0284C7" radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Human Review Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" data-testid="chart-reviews">
              {data && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Pending", count: data.human_reviews_pending },
                      { name: "Reviewed", count: data.human_reviews_reviewed },
                    ]}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip formatter={(value: number) => [`${value} cases`, "Count"]} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48}>
                      <Cell fill="#F59E0B" />
                      <Cell fill="#10B981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-2 flex justify-center gap-4 text-xs text-slate-500">
              <Link to="/human-review" className="font-medium text-teal-700 hover:underline">
                Open Human Review queue
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Degraded / loading states: shell stays, only data regions show skeletons */}
      {(isPending || isError) && (
        <p className="text-xs text-slate-400">
          {isError
            ? "Live statistics unavailable right now - showing dashboard shell."
            : "Loading demo statistics..."}
        </p>
      )}
    </div>
  );
}
