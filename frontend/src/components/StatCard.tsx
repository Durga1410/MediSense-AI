import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  testId,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "low" | "medium" | "high" | "critical" | "primary";
  testId?: string;
}) {
  const tones: Record<string, string> = {
    default: "text-slate-900",
    primary: "text-teal-700",
    low: "text-emerald-600",
    medium: "text-amber-600",
    high: "text-rose-600",
    critical: "text-red-700",
  };
  const chipTones: Record<string, string> = {
    default: "bg-slate-100 text-slate-600",
    primary: "bg-teal-50 text-teal-700",
    low: "bg-emerald-50 text-emerald-600",
    medium: "bg-amber-50 text-amber-600",
    high: "bg-rose-50 text-rose-600",
    critical: "bg-red-50 text-red-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
        <span className={`flex size-8 items-center justify-center rounded-lg ${chipTones[tone] ?? chipTones.default}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className={`mt-2 font-mono text-3xl font-bold tracking-tight ${tones[tone] ?? tones.default}`} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
