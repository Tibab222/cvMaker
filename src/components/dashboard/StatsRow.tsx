import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Briefcase, Clock, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 28 - ((p - min) / (max - min || 1)) * 24;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full">
      <motion.path
        d={d}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

const STATS = [
  {
    key: "apps",
    label: "Active Applications",
    value: "14",
    icon: Briefcase,
    badge: "+3 this week",
    trend: "up" as const,
    spark: [4, 6, 5, 8, 7, 11, 14],
  },
  {
    key: "rate",
    label: "Interview Rate",
    value: "28.5%",
    icon: TrendingUp,
    sub: "4 out of 14 converted",
    progress: 28.5,
  },
  {
    key: "time",
    label: "Avg Response Time",
    value: "8 Days",
    icon: Clock,
    badge: "2 days faster than avg",
    trend: "down" as const,
  },
  {
    key: "match",
    label: "Top Market Match",
    value: "92%",
    icon: Target,
    sub: "Senior Full-Stack affinity",
    progress: 92,
  },
];

export default function StatsRow() {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STATS.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="group relative gap-0 overflow-hidden border-border/70 bg-surface/80 p-5 backdrop-blur transition-colors hover:border-brand/40">
              <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-brand-muted opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <span className="flex size-8 items-center justify-center rounded-md bg-brand-muted text-brand">
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </p>

              {stat.badge && (
                <span
                  className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    stat.trend === "up"
                      ? "bg-success/12 text-success"
                      : "bg-brand-muted text-brand"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {stat.badge}
                </span>
              )}
              {stat.sub && <p className="mt-2 text-xs text-muted-foreground">{stat.sub}</p>}

              {stat.spark && (
                <div className="mt-3">
                  <Sparkline points={stat.spark} />
                </div>
              )}
              {stat.progress !== undefined && (
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-brand"
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.progress}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                  />
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
