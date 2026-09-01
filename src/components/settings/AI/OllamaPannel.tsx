import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Download,
  Terminal,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import type { UserConfig } from "../../../../electron/services/config/UserConfig.interface";
import ManuallyInstallOllama from "./ManuallyInstallOllama";
import InstallOllama from "./InstallOllama";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 240, damping: 22 } },
};

export default function OllamaPannel() {
  const [ollamaInfos, setOllamaInfos] = useState<NonNullable<UserConfig["ollama"]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"initial" | "manualInstall" | "install">("initial");

  useEffect(() => {
    const fetchOllamaInfos = async () => {
      setLoading(true);
      try {
        const infos = await api.getOllamaInfos();
        setOllamaInfos(infos);
      } catch (error) {
        console.error("Failed to fetch Ollama info:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOllamaInfos();
  }, []);

  if (step === "manualInstall") {
    return <ManuallyInstallOllama back={() => setStep("initial")} />;
  }

  if (step === "install") {
    return <InstallOllama back={() => setStep("initial")} />;
  }

  const isConfigured = !!ollamaInfos;

  const statusPill = () => {
    if (loading)
      return { icon: Loader2, label: "Checking...", cls: "bg-muted text-muted-foreground" };
    if (isConfigured)
      return { icon: CheckCircle2, label: "Configured", cls: "bg-primary/10 text-primary" };
    return { icon: HelpCircle, label: "Not setup", cls: "bg-accent text-accent-foreground" };
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
            Local Engine
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Ollama AI Provider
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Run open-source LLMs directly on your machine without sending sensitive CV data to
            external cloud servers. Free, private, and offline.
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

      <AnimatePresence>
        {ollamaInfos && (
          <motion.div
            variants={item}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Current Configuration</h3>
                <p className="text-xs text-muted-foreground">
                  Installation method:{" "}
                  <span className="font-medium text-foreground">
                    {ollamaInfos.installedViaOfficialInstaller
                      ? "Official Installer / Custom Path"
                      : "Managed via cvMaker"}
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={item} className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setStep("install")}
          className={cn(
            "group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all",
            "hover:-translate-y-0.5 hover:border-ring hover:shadow-sm"
          )}
        >
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Download className="h-4.5 w-4.5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">Automatic Installation</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Let cvMaker guide you through downloading and setting up Ollama automatically.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-primary">
            Start setup
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        <button
          onClick={() => setStep("manualInstall")}
          className={cn(
            "group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all",
            "hover:-translate-y-0.5 hover:border-ring hover:shadow-sm"
          )}
        >
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Terminal className="h-4.5 w-4.5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">Manual Connection</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Already running Ollama? Connect directly using a custom host URL or endpoint.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-primary">
            Configure URL
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </motion.div>
    </motion.div>
  );
}