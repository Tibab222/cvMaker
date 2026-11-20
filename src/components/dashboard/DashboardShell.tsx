import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddApplicationDialog from "./AddApplicationDialog";
import StatsRow from "./StatsRow";
import PipelineSection from "./PipelineSection";
import MarketPanel from "./MarketPanel";
import JobDrawer from "./JobDrawer";
import PageHeader from "../general/PageHeader";
import { useDashboard } from "./provider/hook";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function DashboardShell() {
  const { applications, reminders, silentApplications } = useDashboard();
  // long silences count once: they are reviewed together
  const urgent = reminders.filter((r) => r.kind !== "stale_draft").length + (silentApplications.length > 0 ? 1 : 0);
  const [adding, setAdding] = useState(false);

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
        actions={
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5 shadow-sm shadow-brand/20" title="An application you sent without CVMaker">
            <Plus className="size-4" /> Add application
          </Button>
        }
      />
      <AddApplicationDialog open={adding} onOpenChange={setAdding} />

      <motion.main
        className="min-w-0 flex-1 space-y-8 p-4 md:p-6"
        variants={staggerContainer(0.08, 0.05)}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <StatsRow />
        </motion.div>

        <motion.div variants={fadeUp}>
          <PipelineSection />
        </motion.div>

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
