import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/opportunities";

/** Circular match gauge; the arc draws itself in when the card appears. */
export default function ScoreRing({ score, size = 52, className }: { score: number | null; size?: number; className?: string }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} title={`${tone.label}${score !== null ? ` · ${score}/100` : ""}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={tone.stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - (score ?? 0) / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums", tone.text)}>
        {score ?? "–"}
      </span>
    </div>
  );
}
