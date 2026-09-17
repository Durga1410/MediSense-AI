import { PhoneCall } from "lucide-react";

// Mandatory emergency notice — shown on the landing page and the assessment flow.
export function EmergencyBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 ${className}`}
      data-testid="emergency-banner"
      role="alert"
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
        <PhoneCall className="size-4" />
      </span>
      <p className="text-sm leading-relaxed text-red-900">
        <span className="font-bold">Medical emergency?</span> If you are experiencing a medical
        emergency, contact local emergency services or seek immediate medical care.
      </p>
    </div>
  );
}
