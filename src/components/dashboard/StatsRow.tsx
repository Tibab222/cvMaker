import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Briefcase, Clock, Ghost, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EASE_OUT } from "@/lib/motion";
import { useDashboard } from "./provider/hook";

const EMPTY_STATS = {
  activeApplications: 0,
  activitySpark: [0, 0, 0, 0, 0, 0, 0, 0],
  applicationsLastWeek: 0,
  avgResponseTimeDays: 0,
  interviewRate: 0,
  ghostingRate: 0,
  offerRate: 0,
};

/** Number that counts up to its value, so changes on the board are visible at a glance. */
function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const text = useTransform(motionValue, (v) => `${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [motionValue, value]);

  return <motion.span>{text}</motion.span>;
}

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * 100,
    y: 28 - ((p - min) / (max - min || 1)) * 24,
  }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L100,30 L0,30 Z`;

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-9 w-full overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill="url(#spark-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function StatsRow() {
  const { keyStats } = useDashboard();
  const stats = keyStats ?? EMPTY_STATS;
  const trend = stats.activitySpark[stats.activitySpark.length - 1] - stats.activitySpark[0];

  const STATS = [
    {
      key: "apps",
      label: "Active applications",
      value: <AnimatedNumber value={stats.activeApplications} />,
      icon: Briefcase,
      badge: `+${stats.applicationsLastWeek} this week`,
      trend: trend >= 0 ? "up" : "down",
      spark: stats.activitySpark,
      sub: "Applied, interviewing or holding an offer",
    },
    {
      key: "interview-rate",
      label: "Interview rate",
      value: <AnimatedNumber value={stats.interviewRate} decimals={stats.interviewRate % 1 ? 1 : 0} suffix="%" />,
      icon: TrendingUp,
      sub: "Applications that reached an interview",
      progress: Math.min(stats.interviewRate, 100),
    },
    {
      key: "response-time",
      label: "Avg response time",
      value: <AnimatedNumber value={stats.avgResponseTimeDays} decimals={stats.avgResponseTimeDays % 1 ? 1 : 0} suffix=" days" />,
      icon: Clock,
      sub: "From applying to the first answer",
      footer: (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          <Ghost className="size-3" /> {stats.ghostingRate}% ghosted after 30 days
        </span>
      ),
    },
    {
      key: "offer-rate",
      label: "Offer rate",
      value: <AnimatedNumber value={stats.offerRate} decimals={stats.offerRate % 1 ? 1 : 0} suffix="%" />,
      icon: Target,
      sub: "Applications that led to an offer",
      progress: Math.min(stats.offerRate, 100),
    },
  ];

  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STATS.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: EASE_OUT }}
          >
            <Card className="group relative h-full gap-0 overflow-hidden border-border/70 bg-surface/80 p-5 backdrop-blur transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5">
              <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-brand-muted opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <span className="flex size-8 items-center justify-center rounded-md bg-brand-muted text-brand transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{stat.value}</p>

              {stat.badge && (
                <span
                  className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    stat.trend === "up" ? "bg-emerald-500/12 text-emerald-700" : "bg-brand-muted text-brand"
                  }`}
                >
                  {stat.trend === "up" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {stat.badge}
                </span>
              )}
              {stat.sub && <p className="mt-2 text-xs text-muted-foreground">{stat.sub}</p>}
              {stat.footer}

              {stat.spark && (
                <div className="mt-3">
                  <Sparkline points={stat.spark} />
                </div>
              )}
              {stat.progress !== undefined && (
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-violet-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.progress}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.06, ease: EASE_OUT }}
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
