import { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { AlertTriangle, BellRing, CalendarClock, Check, ChevronRight, Coffee, FileClock, Plus, Radar, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { useProfileStore } from "@/store/profile";
import type { Reminder } from "@shared/jobApplications.type";
import { parseDbDate } from "@shared/utils";
import EmptyState from "../general/EmptyState";
import { useDashboard } from "./provider/hook";

/** "Node.js", "nodejs" and "NODE JS" are the same skill. */
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#]/g, "");

const REMINDER_STYLE: Record<Reminder["kind"], { icon: typeof Send; className: string }> = {
  interview: { icon: CalendarClock, className: "bg-amber-500/12 text-amber-700" },
  follow_up: { icon: Send, className: "bg-sky-500/12 text-sky-700" },
  stale_draft: { icon: FileClock, className: "bg-zinc-500/10 text-zinc-600" },
};

function reminderCopy(reminder: Reminder) {
  switch (reminder.kind) {
    case "interview": {
      const date = parseDbDate(reminder.date);
      const when = reminder.days === 0 ? "Today" : reminder.days === 1 ? "Tomorrow" : `In ${reminder.days} days`;
      return {
        title: `Interview · ${reminder.company_name}`,
        detail: reminder.detail || reminder.job_title,
        meta: date ? `${when}, ${format(date, "HH:mm")}` : when,
      };
    }
    case "follow_up":
      return {
        title: `Follow up with ${reminder.company_name}`,
        detail: `${reminder.job_title}${reminder.detail ? ` · ${reminder.detail}` : ""}`,
        meta: `${reminder.days} days of silence`,
      };
    case "stale_draft":
    default:
      return {
        title: `Finish or archive · ${reminder.company_name}`,
        detail: reminder.job_title,
        meta: `Untouched for ${reminder.days} days`,
      };
  }
}

export default function MarketPanel() {
  const { keywords, reminders, openApplication } = useDashboard();
  const { skills, projects } = useProfileStore();

  // everything the profile can prove: declared skills and the tags on project bullets
  // normalized name -> how the user writes it ("PostgreSQL" rather than the lowercase keyword)
  const profileSkills = useMemo(() => {
    const map = new Map<string, string>();
    skills.forEach((s) => map.set(normalize(s.name), s.name));
    projects.forEach((p) => p.bullets.forEach((b) => b.tags.forEach((t) => {
      if (!map.has(normalize(t))) map.set(normalize(t), t);
    })));
    map.delete("");
    return map;
  }, [skills, projects]);

  const maxCount = Math.max(1, ...keywords.map((k) => k.global_count));
  const demand = keywords.map((k) => ({
    ...k,
    share: Math.round((k.global_count / maxCount) * 100),
    inProfile: profileSkills.has(normalize(k.keyword)),
    label: profileSkills.get(normalize(k.keyword)) ?? k.keyword,
  }));
  const gaps = demand.filter((k) => !k.inProfile);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/70 bg-surface/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="size-4 text-brand" /> Market demand
          </CardTitle>
          <CardDescription>Skills that come back most often in the offers you analyzed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {demand.length === 0 ? (
            <EmptyState
              compact
              icon={Radar}
              title="No market data yet"
              description="Analyze a few job offers with AI in the resume editor: their key skills will show up here."
            />
          ) : (
            <motion.div className="space-y-3" variants={staggerContainer(0.04)} initial="hidden" animate="show">
              {demand.map((skill) => (
                <motion.div key={skill.keyword} variants={fadeUp}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm text-foreground">
                      {skill.label}
                      {skill.inProfile ? (
                        <Check className="size-3.5 text-emerald-600" aria-label="In your profile" />
                      ) : (
                        <AlertTriangle className="size-3.5 text-amber-600" aria-label="Missing from your profile" />
                      )}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {skill.global_count} {skill.global_count > 1 ? "offers" : "offer"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={cn("h-full rounded-full", skill.inProfile ? "bg-brand" : "bg-amber-500")}
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.share}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {gaps.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <AlertTriangle className="size-4 text-amber-600" /> Skill gaps
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  In demand but not in your skills or project tags. Add them if you have them, or plan to learn them.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {gaps.map((gap) => (
                    <Badge key={gap.keyword} variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700">
                      <Plus className="size-3" />
                      {gap.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-surface/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="size-4 text-brand" /> Today
          </CardTitle>
          <CardDescription>Upcoming interviews, follow-ups due and drafts left behind</CardDescription>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <EmptyState
              compact
              icon={Coffee}
              title="Nothing urgent"
              description="Interviews you schedule and applications without an answer for a week will show up here."
            />
          ) : (
            <motion.ul className="space-y-2" variants={staggerContainer(0.05)} initial="hidden" animate="show">
              {reminders.map((reminder) => {
                const style = REMINDER_STYLE[reminder.kind];
                const Icon = style.icon;
                const copy = reminderCopy(reminder);
                return (
                  <motion.li key={reminder.id} variants={fadeUp}>
                    <button
                      type="button"
                      onClick={() => openApplication(reminder.application_id)}
                      className="group flex w-full items-start gap-3 rounded-lg border border-border/70 bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md hover:shadow-brand/5"
                    >
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", style.className)}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{copy.title}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{copy.meta}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{copy.detail}</span>
                      </span>
                      <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
