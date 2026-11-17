import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileUp, Loader2, Vault } from "lucide-react";
import { cn } from "@/lib/utils";
import VaultCard from "./VaultCard";
import VaultMatchPanel from "./VaultMatchPanel";
import type { VaultState } from "./useVault";

/** Finished PDF resumes: drop them in, see what each one is about, find the right one for an offer. */
export default function ResumeVault({ vault, search }: { vault: VaultState; search: string }) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const needle = search.trim().toLowerCase();
  const visible = (vault.resumes ?? []).filter((resume) => !needle || [resume.name, resume.file_name, ...resume.keywords].some((value) => value.toLowerCase().includes(needle)));
  const hasText = (vault.resumes ?? []).some((resume) => resume.has_text);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && input.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            depth.current++;
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => {
            depth.current = Math.max(0, depth.current - 1);
            if (depth.current === 0) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            depth.current = 0;
            setDragging(false);
            void vault.importFiles([...event.dataTransfer.files]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors",
            dragging ? "border-brand bg-brand-muted/60" : "border-border hover:border-brand/50 hover:bg-muted/40",
          )}
        >
          <motion.span animate={{ y: dragging ? -3 : 0, scale: dragging ? 1.08 : 1 }} className="flex size-10 items-center justify-center rounded-xl bg-brand-muted text-brand">
            <FileUp className="size-5" />
          </motion.span>
          <p className="text-sm font-medium text-foreground">{dragging ? "Drop to add to your vault" : "Drop PDF resumes here, or browse"}</p>
          <p className="max-w-md text-xs text-muted-foreground">Each resume is read on this computer: its keywords are kept so the right one can be picked for an offer, without generating a new one.</p>
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            onChange={(event) => {
              void vault.importFiles([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
        </div>

        <AnimatePresence initial={false}>
          {vault.importing.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 overflow-hidden rounded-lg border border-border/70 bg-card px-3 py-2 text-xs"
            >
              <Loader2 className="size-3.5 animate-spin text-brand" />
              <span className="truncate font-medium text-foreground">{item.fileName}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">{item.step === "reading" ? "Reading…" : "Finding keywords…"}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {vault.resumes === null ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {[0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : visible.length > 0 ? (
          <motion.div layout className="grid gap-3 xl:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {visible.map((resume) => (
                <VaultCard key={resume.id} resume={resume} onRename={vault.rename} onRemove={vault.remove} onOpen={vault.open} onReveal={vault.reveal} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-card px-6 py-10 text-center">
            <Vault className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{needle ? "No resume matches your search" : "Your vault is empty"}</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {needle ? "Try another word." : "Add the resumes you already send (by role, by language…). CV Maker tells you which one fits each offer."}
            </p>
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <VaultMatchPanel onOpen={vault.open} disabled={!hasText} />
      </div>
    </div>
  );
}
