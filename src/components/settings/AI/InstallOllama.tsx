import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Cpu,
  MemoryStick,
  MonitorSmartphone,
  Sparkles,
  Zap,
  Download,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SystemRecommendations } from "@shared/SystemRecommendation";
import type { SetupProgressStatus } from "@shared/OllamaDownloadStatus";
import { api } from "@/api";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 240, damping: 22 },
  },
};

const formatBytes = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "0 MB";
  return `${(bytes / 1_000_000).toFixed(0)} MB`;
};

export const InstallOllama = ({ back }: { back: () => void }) => {
  const [ollamaInstalled, setOllamaInstalled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommendedModel, setRecommendedModel] = useState<SystemRecommendations | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progressStatus, setProgressStatus] = useState<SetupProgressStatus | null>(null);

  useEffect(() => {
    const unsubscribe = api.onOllamaProgress(setProgressStatus);
    if (!ollamaInstalled) {
      (async () => {
        setLoading(true);
        setRecommendedModel(await api.getOllamaSystemRecommendations());
        setLoading(false);
      })();
    }
    return () => unsubscribe?.();
  }, [ollamaInstalled]);

  useEffect(() => {
    const checkOllamaInstalled = async () => {
      const ollamaInfos = await api.getOllamaInfos();
        if (!ollamaInfos?.installedViaOfficialInstaller && ollamaInfos?.localModels?.length && ollamaInfos?.localModels?.length > 0) {
          setOllamaInstalled(true);
        }
    };
    checkOllamaInstalled();
  }, []);

  const installOllama = async () => {
    const targetModel = recommendedModel?.recommendedModel;
    if (!targetModel) return;
    setIsInstalling(true);
    setProgressStatus(null);
    try {
      await api.installOllama(targetModel);
      setOllamaInstalled(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsInstalling(false);
    }
  };

  const hw = recommendedModel?.systemHardware;
  const specs = hw
    ? [
        { icon: Zap, label: "GPU", value: hw.gpuModel },
        { icon: Cpu, label: "CPU", value: hw.cpuModel },
        { icon: MemoryStick, label: "RAM", value: `${hw.ramTotalGB} GB` },
        { icon: MonitorSmartphone, label: "OS", value: hw.os },
      ]
    : [];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      className="mx-auto w-full max-w-2xl px-4 py-10"
    >
      <motion.div variants={item}>
        <button
          onClick={back}
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
      </motion.div>

      <motion.div variants={item} className="mt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3 w-3" />
          Guided setup
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Install Ollama
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We'll handle everything for you — just hit install and we'll set up Ollama with the model
          best suited to your machine.
        </p>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {loading && !recommendedModel && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-2 rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning your hardware…
            </div>
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          </motion.div>
        )}

        {recommendedModel && (
          <motion.div
            key="specs"
            variants={container}
            initial="hidden"
            animate="show"
            className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <motion.h2
              variants={item}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Your system
            </motion.h2>

            <motion.ul variants={container} className="mt-3 grid gap-2 sm:grid-cols-2">
              {specs.map((s) => (
                <motion.li
                  key={s.label}
                  variants={item}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </span>
                    <span className="block truncate text-sm font-medium text-foreground">
                      {s.value}
                    </span>
                  </span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div
              variants={item}
              className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                  hw?.hasDedicatedGPU
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Zap className="h-3 w-3" />
                {hw?.hasDedicatedGPU ? "Dedicated GPU detected" : "No dedicated GPU"}
              </span>
            </motion.div>

            <motion.div
              variants={item}
              className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
            >
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Recommended model
                </p>
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  {recommendedModel.recommendedModel}
                </p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={item} className="mt-6">
        <Button
          size="lg"
          className="w-full gap-2 sm:w-auto"
          disabled={!recommendedModel || isInstalling || ollamaInstalled}
          onClick={installOllama}
        >
          {isInstalling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : ollamaInstalled ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isInstalling ? "Installing…" : ollamaInstalled ? "Installed" : "Install Ollama"}
        </Button>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {isInstalling && progressStatus && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-foreground">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                <span className="truncate">
                  {progressStatus.type === "binary_download"
                    ? `${progressStatus.statusText ?? "Downloading Ollama binary"} (${formatBytes(
                        progressStatus.completedBytes,
                      )} / ${formatBytes(progressStatus.totalBytes)})`
                    : `Pulling model (${progressStatus.statusText})`}
                </span>
              </span>
              <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                {progressStatus.percent}%
              </span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${progressStatus.percent}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </motion.div>
        )}

        {ollamaInstalled && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Ollama installed successfully</p>
              <p className="text-sm text-muted-foreground">
                {recommendedModel?.recommendedModel} is ready to use.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InstallOllama;