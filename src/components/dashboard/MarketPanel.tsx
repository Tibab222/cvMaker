import { motion } from "framer-motion";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  FileText,
} from "lucide-react";
import { REMINDERS } from "@/lib/dashboard-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDashboard } from "./provider/hook";

export default function MarketPanel() {
  const { keywords } = useDashboard();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/70 bg-surface/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Market Demand</CardTitle>
          <CardDescription>
            Top technologies or skills extracted from analyzed job mandates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {keywords.map((skill, i) => (
              <div key={i}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    {skill.keyword}
                    {/* {skill.inProfile ? (
                      <Check className="size-3.5 text-success" />
                    ) : (
                      <X className="size-3.5 text-warning" />
                    )} */}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {/* TODO: Replace N with the actual number of jobs */}
                    {skill.global_count}% required across N jobs
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={`h-full rounded-full ${skill.global_count ? "bg-brand" : "bg-warning"}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.global_count}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.04 }}
                  />
                </div>
                {/* <p className="mt-1 text-[11px] text-muted-foreground">
                  {skill.inProfile ? "In your profile" : "Missing in CV"}
                </p> */}
              </div>
            ))}
          </div>

          <Separator />

{/* TODO: Add a section for skill gaps */}
          {/* <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <AlertTriangle className="size-4 text-warning" /> Skill gaps
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              High-demand keywords missing from your primary CV
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {SKILL_GAPS.map((gap) => (
                <Badge
                  key={gap}
                  variant="outline"
                  className="gap-1 border-warning/30 bg-warning/10 text-warning"
                >
                  <Plus className="size-3" />
                  {gap}
                </Badge>
              ))}
            </div>
          </div> */}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-surface/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="size-4 text-brand" /> Today's Focus & Relances
          </CardTitle>
          <CardDescription>Pending follow-ups and upcoming interviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {REMINDERS.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group flex items-start gap-3 rounded-lg border border-border/70 bg-surface-elevated/70 p-3 transition-colors hover:border-brand/50"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                  r.kind === "followup"
                    ? "bg-warning/12 text-warning"
                    : "bg-brand-muted text-brand"
                }`}
              >
                {r.kind === "followup" ? (
                  <AlertTriangle className="size-4" />
                ) : (
                  <CalendarClock className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{r.meta}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.detail}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1.5 h-7 px-2 text-xs text-brand hover:bg-brand-muted"
                >
                  <FileText className="size-3" />
                  {r.kind === "followup" ? "Draft follow-up" : "Open CV used"}
                </Button>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
