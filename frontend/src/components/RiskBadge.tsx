import { AlertOctagon, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import type { RiskLevel } from "@/lib/types";

// Redundant risk encoding: color + icon + text label (color-blindness safe).
const RISK_STYLES: Record<RiskLevel, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  CRITICAL: "border-red-900 bg-red-950 text-red-100",
};

const RISK_ICONS: Record<RiskLevel, typeof ShieldCheck> = {
  LOW: ShieldCheck,
  MEDIUM: AlertTriangle,
  HIGH: ShieldAlert,
  CRITICAL: AlertOctagon,
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: "#10B981",
  MEDIUM: "#F59E0B",
  HIGH: "#F43F5E",
  CRITICAL: "#DC2626",
};

export function RiskBadge({ level, className = "" }: { level: RiskLevel; className?: string }) {
  const Icon = RISK_ICONS[level] ?? ShieldCheck;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide ${RISK_STYLES[level] ?? ""} ${className}`}
    >
      <Icon className="size-3.5" />
      {level}
    </span>
  );
}
