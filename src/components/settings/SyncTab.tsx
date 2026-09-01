import { useState } from "react";
import { motion } from "framer-motion";
import {
  FolderSync,
  Database,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import { useProfileStore } from "@/store/profile";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 240, damping: 22 } },
};

export default function SyncTab({ back }: { back?: () => void }) {
  const { experience, projects, id } = useProfileStore();
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<boolean | null>(null);

  const handleSync = async () => {
    if (!id) {
      toast.error("Profile ID not found. Unable to sync.");
      return;
    }

    setSyncing(true);
    try {
      await api.syncDb(id, experience, projects);
      setLastSynced(true);
      toast.success("Database synced successfully!");
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to synchronize local database");
      setLastSynced(false);
    } finally {
      setSyncing(false);
    }
  };

  const statusPill = () => {
    if (syncing)
      return { icon: Loader2, label: "Syncing...", cls: "bg-muted text-muted-foreground" };
    if (lastSynced === true)
      return { icon: CheckCircle2, label: "Synced", cls: "bg-primary/10 text-primary" };
    return { icon: Database, label: "Local storage", cls: "bg-accent text-accent-foreground" };
  };

  const Status = statusPill();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      className="mx-auto w-full max-w-2xl px-4 py-10"
    >
      {back && (
        <motion.div variants={item}>
          <button
            onClick={back}
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
        </motion.div>
      )}

      <motion.div variants={item} className="mt-6 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" />
            Vector Storage
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Synchronize Local Data
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your experiences and projects are converted into vector embeddings and stored locally.
            This powers the smart matching system when tailoring your resume.
          </p>
        </div>
        <motion.span
          layout
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            Status.cls
          )}
        >
          <Status.icon className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          {Status.label}
        </motion.span>
      </motion.div>

      <motion.div
        variants={item}
        className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            If you have manually edited your JSON configuration files, or if you notice inconsistencies in candidate matching during CV generation, trigger a manual re-index.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            disabled={syncing || !id}
            onClick={handleSync}
            className={cn("gap-2 transition-all", lastSynced && "bg-primary/90 hover:bg-primary")}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderSync className="h-4 w-4" />
            )}
            {syncing ? "Syncing database…" : "Synchronize local data"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}