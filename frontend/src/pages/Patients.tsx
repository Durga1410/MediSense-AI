import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/RiskBadge";
import { apiGet } from "@/lib/api";
import type { Department, Patient, RiskLevel } from "@/lib/types";

export default function Patients() {
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("all");
  const [department, setDepartment] = useState("all");

  const { data: patients, isPending } = useQuery({
    queryKey: ["patients"],
    queryFn: () => apiGet<Patient[]>("/patients"),
  });
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiGet<Department[]>("/departments"),
  });

  const filtered = useMemo(() => {
    let list = patients ?? [];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.patient_code.toLowerCase().includes(needle),
      );
    }
    if (risk !== "all") list = list.filter((p) => p.risk_level === risk);
    if (department !== "all") list = list.filter((p) => p.department === department);
    return list;
  }, [patients, q, risk, department]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Patients</h2>
          <p className="text-sm text-slate-500">Synthetic demo directory - no real patient data.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <Info className="size-3.5" />
          Demo data
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or patient ID..."
            className="pl-9"
            data-testid="patients-search-input"
          />
        </div>
        <Select value={risk} onValueChange={(value: string) => setRisk(value)}>
          <SelectTrigger className="w-full sm:w-44" data-testid="patients-risk-filter">
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
        <Select value={department} onValueChange={(value: string) => setDepartment(value)}>
          <SelectTrigger className="w-full sm:w-52" data-testid="patients-department-filter">
            <SelectValue>{(v: string) => (v === "all" ? "All departments" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(departments ?? []).map((d) => (
              <SelectItem key={d.id} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Last Assessment</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id} data-testid={`patient-row-${p.patient_code}`}>
                <TableCell className="font-mono text-xs font-semibold text-teal-700">{p.patient_code}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono">{p.age ?? "-"}</TableCell>
                <TableCell className="capitalize">{p.gender}</TableCell>
                <TableCell className="font-mono text-xs">{p.last_assessment ?? "-"}</TableCell>
                <TableCell>{p.risk_level ? <RiskBadge level={p.risk_level as RiskLevel} /> : <span className="text-slate-400">-</span>}</TableCell>
                <TableCell>{p.department ?? "-"}</TableCell>
                <TableCell>
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {p.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {isPending && <p className="px-4 pb-4 text-sm text-slate-400">Loading patients...</p>}
        {!isPending && filtered.length === 0 && (
          <p className="px-4 pb-4 text-sm text-slate-400" data-testid="patients-empty">
            No patients match the current filters.
          </p>
        )}
      </div>
    </div>
  );
}
