import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Folder,
  FolderOpen,
  FolderCheck,
  FolderX,
  Loader2,
  Sparkles,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/api";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 240, damping: 22 } },
};

export const ExportPathSettings = () => {
  const [exportPath, setExportPath] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const defaultPath = await api.getDefaultExportPath?.();
        if (defaultPath) setExportPath(defaultPath);
      } catch (error) {
        console.error("Failed to load export path:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleBrowseFolder = async () => {
    try {
      const selectedFolder = await api.selectExportFolder?.();
      if (selectedFolder) {
        setExportPath(selectedFolder);
      }
    } catch (error) {
      toast.error("Failed to select folder");
      console.error("Error selecting folder:", error);
    }
  };

  const handleSavePath = async () => {
    if (!exportPath.trim()) return;
    setSaving(true);
    try {
      await api.setDefaultExportPath?.(exportPath.trim());
      toast.success("Default export location saved");
    } catch (error) {
      toast.error("Failed to save export path");
      console.error("Error saving export path:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearPath = async () => {
    setSaving(true);
    try {
      await api.setDefaultExportPath?.("");
      setExportPath("");
      toast.success("Default location cleared (will prompt on each export)");
    } catch (error) {
      console.error("Error clearing export path:", error);
      toast.error("Failed to clear path");
    } finally {
      setSaving(false);
    }
  };

  const hasPathConfigured = exportPath.trim() !== "";

  const statusPill = () => {
    if (loading)
      return { icon: Loader2, label: "Loading...", cls: "bg-muted text-muted-foreground" };
    if (hasPathConfigured)
      return { icon: FolderCheck, label: "Path set", cls: "bg-primary/10 text-primary" };
    return { icon: FolderX, label: "Prompt on export", cls: "bg-accent text-accent-foreground" };
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
      <motion.div variants={item} className="mt-6 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" />
            Preferences
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Export Destination
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Set a default folder where your generated PDF resumes will be saved automatically.
            If left empty, you'll be prompted to choose a location each time.
          </p>
        </div>
        <motion.span
          layout
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            Status.cls
          )}
        >
          <Status.icon className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          {Status.label}
        </motion.span>
      </motion.div>

      <motion.div
        variants={item}
        className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Default Export Folder
        </label>
        
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-1 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="text"
            placeholder="No default path configured (click browse to select)"
            value={exportPath}
            onChange={(e) => setExportPath(e.target.value)}
            className="h-10 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 font-mono text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBrowseFolder}
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Browse
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={!hasPathConfigured || saving}
            onClick={handleSavePath}
            className={cn("gap-2 transition-all", hasPathConfigured && "bg-primary/90 hover:bg-primary")}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save location"}
          </Button>

          {hasPathConfigured && (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={handleClearPath}
              className="gap-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear path
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ExportPathSettings;