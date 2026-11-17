import { CircleCheck, CircleDashed, CircleX, Clock3, Sparkles } from "lucide-react";
import { TONE_CLASSES, type Tone } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const TONE_ICONS = {
  info: Sparkles,
  warn: Clock3,
  ok: CircleCheck,
  danger: CircleX,
  muted: CircleDashed,
} satisfies Record<Tone, unknown>;

export default function StatusPill({ label, tone, className }: { label: string; tone: Tone; className?: string }) {
  const Icon = TONE_ICONS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
