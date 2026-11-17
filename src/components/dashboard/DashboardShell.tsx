import { motion } from "framer-motion";
import { LayoutDashboard } from "lucide-react";
import StatsRow from "./StatsRow";
import KanbanBoard from "./KanbanBoard";
import MarketPanel from "./MarketPanel";
import JobDrawer from "./JobDrawer";
import PageHeader from "../general/PageHeader";
import { useDashboard } from "./provider/hook";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function DashboardShell() {
  const { applications, reminders } = useDashboard();
  const urgent = reminders.filter((r) => r.kind !== "stale_draft").length;

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Career dashboard"
        description={
          applications.length === 0
            ? "Your local job-search pipeline"
            : `${applications.length} application${applications.length > 1 ? "s" : ""} tracked${urgent ? ` · ${urgent} thing${urgent > 1 ? "s" : ""} to do` : ""}`
        }
      />

      <motion.main
        className="min-w-0 flex-1 space-y-8 p-4 md:p-6"
        variants={staggerContainer(0.08, 0.05)}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <StatsRow />
        </motion.div>

        <motion.section variants={fadeUp} className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Application pipeline</h2>
            <p className="text-xs text-muted-foreground">Drag cards between stages · click a card for its full history</p>
          </div>
          <KanbanBoard />
        </motion.section>

        <motion.section variants={fadeUp} className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">My market</h2>
            <p className="text-xs text-muted-foreground">What employers ask for, and what needs your attention</p>
          </div>
          <MarketPanel />
        </motion.section>
      </motion.main>

      <JobDrawer />
    </>
  );
}
