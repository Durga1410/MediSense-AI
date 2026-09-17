import { motion } from "motion/react";
import { RISK_COLORS } from "@/components/RiskBadge";
import type { RiskLevel } from "@/lib/types";

// Circular risk gauge: animated stroke arc + redundant numeric score + level label.
export function RiskGauge({
  level,
  score,
  size = 180,
}: {
  level: RiskLevel;
  score: number;
  size?: number;
}) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const color = RISK_COLORS[level] ?? "#0D9488";

  return (
    <div className="relative inline-flex items-center justify-center" data-testid="risk-gauge">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress / 100) }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Risk Score
        </span>
        <span className="font-mono text-4xl font-bold tracking-tight text-slate-900">{score}</span>
        <span className="mt-0.5 text-xs font-semibold" style={{ color }}>
          {level}
        </span>
      </div>
    </div>
  );
}
