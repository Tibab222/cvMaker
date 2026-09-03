import {
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsRow from "./StatsRow";
import KanbanBoard from "./KanbanBoard";
import MarketPanel from "./MarketPanel";

export default function DashboardShell() {
  return (
    <>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl md:px-6">
            <div>
                <h1 className="text-sm font-semibold">Career Analytics</h1>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                    Local pipeline · 24 mandates indexed
                </p>
            </div>
            <div className="relative ml-auto hidden w-72 lg:block">
                {/* <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search roles, companies…"
                    className="h-9 bg-surface/70 pl-9 pr-12"
                />
                <kbd className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Command className="size-2.5" />K
                </kbd> */}
            </div>
            <Button variant="ghost" size="icon" className="ml-auto lg:ml-0" aria-label="Notifications">
                <Bell className="size-4" />
            </Button>
        </header>

        <main className="flex-1 space-y-6 p-4 md:p-6 min-w-0 overflow-y-auto">
            <StatsRow />

            <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold">Application Pipeline</h2>
                    <p className="text-xs text-muted-foreground">
                        Drag cards between stages · click a card for the full dossier
                    </p>
                </div>
            </div>
            <KanbanBoard />
            </section>

            <section className="space-y-3">
            <h2 className="text-base font-semibold">My Market</h2>
            <MarketPanel />
            </section>
        </main>
    </>
  );
}
