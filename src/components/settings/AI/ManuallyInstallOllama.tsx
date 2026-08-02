import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Cpu,
  Download,
  Link2,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
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

export const ManuallyInstallOllama = ({ back }: { back: () => void }) => {
  const [ollamaPath, setOllamaPath] = useState("http://127.0.0.1:11434");
  const [ollamaDetected, setOllamaDetected] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<{modelName: string, preferred: boolean}[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const isValid = ollamaPath.trim() !== "" && ollamaPath.startsWith("http");

  const detectOllama = async () => {
    setDetecting(true);
    try {
      const detected = await api.detectOllama(ollamaPath);
      setOllamaDetected(detected);
      if (!detected)
        toast.error("Ollama not detected. Make sure it's running and the URI is correct.");
      else toast.success("Ollama detected");
    } finally {
      setDetecting(false);
    }
  };

  const setOllamaModel = async (model: string) => {
    setSelectedModel(model);
    await api.setPreferredOllamaModel(model);
    toast.success(`Selected ${model}`);
  };

  useEffect(() => {
    (async () => {
      const models = await api.getAvailableOllamaModels();
      setOllamaModels(models);
      setOllamaDetected(models.length > 0);
      const preferredModel = models.find((model) => model.preferred);
      if (preferredModel) setSelectedModel(preferredModel.modelName);
    })();
  }, []);

  const statusPill = () => {
    if (ollamaDetected === null)
      return { icon: Cpu, label: "Not checked", cls: "bg-muted text-muted-foreground" };
    if (ollamaDetected)
      return { icon: CheckCircle2, label: "Connected", cls: "bg-primary/10 text-primary" };
    return { icon: XCircle, label: "Offline", cls: "bg-destructive/10 text-destructive" };
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
      <motion.div variants={item}>
        <button
          onClick={back}
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
      </motion.div>

      <motion.div variants={item} className="mt-6 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" />
            Manual setup
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Connect your Ollama instance
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Download and run Ollama locally, then point us to it. We'll pick up your installed
            models automatically.
          </p>
        </div>
        <motion.span
          layout
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            Status.cls,
          )}
        >
          <Status.icon className="h-3.5 w-3.5" />
          {Status.label}
        </motion.span>
      </motion.div>

      <motion.div
        variants={item}
        className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ollama endpoint
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-1 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="http://127.0.0.1:11434"
            value={ollamaPath}
            onChange={(e) => setOllamaPath(e.target.value)}
            className="h-10 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={!isValid || detecting}
            onClick={detectOllama}
            className={cn("gap-2 transition-all", ollamaDetected && "bg-primary/90 hover:bg-primary")}
          >
            {detecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : ollamaDetected ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Cpu className="h-4 w-4" />
            )}
            {detecting ? "Detecting…" : ollamaDetected ? "Connected" : "Detect Ollama"}
          </Button>

          <a
            href="https://ollama.com/download"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Download className="h-4 w-4" />
            Download Ollama
          </a>
        </div>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {ollamaModels.length > 0 && (
          <motion.div
            key="models"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="mt-6"
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-foreground">Available models</h3>
              <span className="text-xs text-muted-foreground">{ollamaModels.length} found</span>
            </div>

            <motion.ul
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-2 sm:grid-cols-2"
            >
              {ollamaModels.map((model) => {
                const active = selectedModel === model.modelName;
                return (
                  <motion.li key={model.modelName} variants={item} layout>
                    <button
                      onClick={() => setOllamaModel(model.modelName)}
                      className={cn(
                        "group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all",
                        "hover:-translate-y-0.5 hover:border-ring hover:shadow-sm",
                        active && "border-primary/40 bg-primary/5 ring-1 ring-primary/30",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors",
                            active && "bg-primary text-primary-foreground",
                          )}
                        >
                          <Cpu className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-foreground">{model.modelName}</span>
                      </span>
                      <AnimatePresence>
                        {active && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="text-primary"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ManuallyInstallOllama;