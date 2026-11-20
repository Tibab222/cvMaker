import { useState } from "react";
import { format } from "date-fns";
import { Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { APPLICATION_CHANNELS, NO_RESPONSE_AFTER_DAYS, type SilentApplication } from "@shared/jobApplications.type";
import { parseDbDate } from "@shared/utils";
import { useDashboard } from "./provider/hook";

const channelLabel = (app: SilentApplication) => APPLICATION_CHANNELS.find((channel) => channel.value === app.channel)?.label;

/** Applications silent for weeks, reviewed together: all ticked, untick the ones still worth waiting for. */
export default function NoResponseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-lg">
        {/* mounted on each opening, so the selection starts from the current list */}
        {open && <Review onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function Review({ onDone }: { onDone: () => void }) {
  const { silentApplications, markNoResponse, openApplication } = useDashboard();
  const [selected, setSelected] = useState(() => new Set(silentApplications.map((app) => app.id)));
  const [busy, setBusy] = useState(false);
  const count = silentApplications.filter((app) => selected.has(app.id)).length;
  const all = count === silentApplications.length && count > 0;

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const close = async () => {
    setBusy(true);
    const closed = await markNoResponse(silentApplications.filter((app) => selected.has(app.id)).map((app) => app.id));
    setBusy(false);
    if (closed > 0) onDone();
  };

  return (
    <>
      <DialogHeader className="border-b border-border/70 px-6 py-5">
        <DialogTitle className="flex items-center gap-2">
          <Ghost className="size-4 text-muted-foreground" /> No answer for {NO_RESPONSE_AFTER_DAYS}+ days
        </DialogTitle>
        <DialogDescription>
          Companies rarely answer after this long. Closing them as <span className="font-medium text-foreground">No response</span> keeps
          your pipeline honest and your stats right. They stay in Closed: if one answers later, move its card back.
        </DialogDescription>
      </DialogHeader>

      {silentApplications.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">Nothing left: every application got an answer or a follow-up recently.</p>
      ) : (
        <>
          <label className="flex cursor-pointer items-center gap-3 border-b border-border/70 px-6 py-2.5 text-xs font-medium text-muted-foreground">
            <Checkbox
              checked={all ? true : count > 0 ? "indeterminate" : false}
              onCheckedChange={(value) => setSelected(value === true ? new Set(silentApplications.map((app) => app.id)) : new Set())}
              aria-label="Select all"
            />
            {count} of {silentApplications.length} selected
          </label>
          <ul className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto">
            {silentApplications.map((app) => {
              const applied = parseDbDate(app.applied_at);
              const channel = channelLabel(app);
              const checked = selected.has(app.id);
              return (
                <li key={app.id} className={cn("flex items-center gap-3 px-6 py-3 transition-colors", !checked && "opacity-60")}>
                  <Checkbox id={`silent-${app.id}`} checked={checked} onCheckedChange={(value) => toggle(app.id, value === true)} />
                  <label htmlFor={`silent-${app.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {app.company_name} <span className="font-normal text-muted-foreground">· {app.job_title}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {applied ? `Applied ${format(applied, "d MMM yyyy")}` : "Applied"}
                      {channel ? ` via ${channel}` : ""}
                      {app.follow_ups > 0 ? ` · ${app.follow_ups} follow-up${app.follow_ups > 1 ? "s" : ""}` : ""}
                    </span>
                  </label>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground" title="Days since the last sign of life">{app.days} d</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => {
                      onDone();
                      openApplication(app.id);
                    }}
                  >
                    View
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <DialogFooter className="m-0 border-t border-border/70 px-6 py-4">
        <Button variant="outline" onClick={onDone} disabled={busy}>
          Not now
        </Button>
        <Button onClick={() => void close()} disabled={busy || count === 0}>
          {count === 0 ? "Close as No response" : `Close ${count} as No response`}
        </Button>
      </DialogFooter>
    </>
  );
}
