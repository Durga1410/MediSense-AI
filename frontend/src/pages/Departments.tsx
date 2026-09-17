import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Baby,
  Bone,
  Brain,
  Building2,
  Ear,
  HeartPulse,
  Microscope,
  Stethoscope,
  Siren,
  Wind,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Department } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  "General Medicine": Stethoscope,
  Cardiology: HeartPulse,
  Pulmonology: Wind,
  Neurology: Brain,
  Gastroenterology: Activity,
  Orthopedics: Bone,
  Dermatology: Microscope,
  ENT: Ear,
  Pediatrics: Baby,
  Gynecology: UserRound,
  "Emergency Care": Siren,
  "Internal Medicine": Building2,
};

export default function Departments() {
  const { data, isPending } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiGet<Department[]>("/departments"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Departments</h2>
        <p className="text-sm text-slate-500">
          Where the AI routes each symptom pattern - recommendations are always explainable.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((d) => {
          const Icon = ICONS[d.name] ?? Building2;
          return (
            <div
              key={d.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
              data-testid={`department-card-${d.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Icon className="size-5" />
                </span>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold tracking-tight text-slate-900">{d.assessment_count}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">assessments</p>
                </div>
              </div>
              <h3 className="mt-4 font-heading text-lg font-bold tracking-tight">{d.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{d.specialization}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {d.common_symptoms.map((s) => (
                  <span key={s} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {s}
                  </span>
                ))}
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                {d.doctor_count} specialists on staff (demo roster)
              </p>
            </div>
          );
        })}
      </div>

      {isPending && <p className="text-sm text-slate-400">Loading departments...</p>}
    </div>
  );
}
