import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Key,
  KeyRound,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const SetupGemini = () => {
  const [apiKey, setApiKey] = useState("");
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchApiKey = async () => {
      setLoading(true);
      try {
        const existingKey = await api.getApiKey();
        if (existingKey) {
          setApiKey(existingKey);
          setHasExistingKey(true);
        }
      } catch (err) {
        console.error("Failed to fetch API key:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  useEffect(() => {
    const unsubscribe = api.onError((errorMessage) => {
      console.error("Received error from main process:", errorMessage);
      setError(errorMessage);
    });
    return unsubscribe;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.setupGemini(apiKey.trim());
      setHasExistingKey(true);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Failed to validate or save API key. Please check the key and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      className="mx-auto w-full max-w-2xl px-4 py-10"
    >
      {/* Header */}
      <motion.div variants={item} className="mt-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3 w-3" />
          Cloud Provider
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Setup Gemini API
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your Google Gemini API key to access cloud AI capabilities alongside or as an alternative to local models.
        </p>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {/* Loading Skeleton */}
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking saved API key…
            </div>
            <div className="h-10 animate-pulse rounded-xl bg-muted" />
          </motion.div>
        )}

        {/* Content Card */}
        {!loading && (
          <motion.div
            key="content"
            variants={container}
            initial="hidden"
            animate="show"
            className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            {/* Existing Status Banner */}
            {hasExistingKey && !success && (
              <motion.div
                variants={item}
                className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Gemini API key configured
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You can update your API key below if needed.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Input Form */}
            <motion.form variants={item} onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  API Key
                </label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setError(null);
                      setSuccess(false);
                    }}
                    className="pl-10 pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Get API Key Link */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  Need a key?
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Get a free key on Google AI Studio
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Action Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 sm:w-auto"
                disabled={!apiKey.trim() || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Save API Key"}
              </Button>
            </motion.form>

            {/* Error state */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Success Feedback */}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 20 }}
                className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">API key updated successfully</p>
                  <p className="text-xs text-muted-foreground">
                    Gemini API is ready to use.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SetupGemini;