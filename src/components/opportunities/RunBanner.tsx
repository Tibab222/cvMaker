import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, Hourglass, Radar, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiscoveryRunStatus } from "@shared/discovery.types";

/** Ticks every second while a countdown is shown. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/**
 * Live progress of the background search. While waiting on a site's cooldown it says so,
 * so a slow search reads as "being polite", not as "stuck".
 */
export default function RunBanner({ status, onCancel }: { status: DiscoveryRunStatus | null; onCancel: () => void }) {
  const waiting = !!status?.running && !!status.waitingUntil;
  const now = useNow(waiting);
  const seconds = status?.waitingUntil ? Math.max(0, Math.ceil((status.waitingUntil - now) / 1000)) : 0;
  const progress = status && status.total > 0 ? (status.done / status.total) * 100 : 0;
  const finishedRecently = !!status && !status.running && !!status.finishedAt;

  return (
    <AnimatePresence initial={false}>
      {status?.running && (
        <motion.div
          key="running"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="relative overflow-hidden rounded-xl border border-brand/25 bg-brand-muted/60 p-4">
            {/* scanning sweep */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-brand/10 to-transparent"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative flex items-center gap-3">
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                <Radar className="size-4.5 animate-spin [animation-duration:3s]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Searching {status.current ?? "your boards"}
                  <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                    {status.done}/{status.total} boards · {status.added} new
                  </span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  {waiting ? (
                    <>
                      <Hourglass className="size-3" />
                      Next request in {seconds}s, so no site gets two requests in a row
                    </>
                  ) : (
                    "Fetching the offers…"
                  )}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={onCancel} className="gap-1.5 bg-background/70">
                <Square className="size-3" /> Stop
              </Button>
            </div>
            <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-background/70">
              <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${Math.max(progress, 4)}%` }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.6 }} />
            </div>
          </div>
        </motion.div>
      )}

      {finishedRecently && status.errors.length > 0 && (
        <motion.div
          key="errors"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 text-xs text-amber-800">
            <p className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="size-3.5" />
              Last search {status.finishedAt ? formatDistanceToNowStrict(new Date(status.finishedAt), { addSuffix: true }) : ""}: {status.errors.length} problem{status.errors.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-800/90">
              {status.errors.slice(0, 4).map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
