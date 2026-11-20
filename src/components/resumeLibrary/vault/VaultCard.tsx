import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { Check, ExternalLink, FileText, FolderOpen, Loader2, Pencil, ScanText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseDbDate } from "@shared/utils";
import type { VaultResume } from "@shared/vault.types";

interface Props {
  resume: VaultResume;
  onRename: (id: string, name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
  onReveal: (id: string) => void;
}

const formatSize = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** One finished resume: first page, name (editable), what it is about, and the file itself. */
const VaultCard = forwardRef<HTMLDivElement, Props>(function VaultCard({ resume, onRename, onRemove, onOpen, onReveal }, ref) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(resume.name);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const added = parseDbDate(resume.created_at);
  const shown = resume.keywords.slice(0, 10);

  const saveName = async () => {
    setEditing(false);
    if (name.trim() && name.trim() !== resume.name) await onRename(resume.id, name);
    else setName(resume.name);
  };

  const remove = async () => {
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setRemoving(true);
    await onRemove(resume.id);
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group flex overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => onOpen(resume.id)}
        className="relative w-28 shrink-0 overflow-hidden border-r border-border/60 bg-muted/40"
        aria-label={`Open ${resume.name}`}
        title="Open the PDF"
      >
        {resume.thumbnail ? (
          <img src={resume.thumbnail} alt="" className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground"><FileText className="size-8" /></span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 text-background opacity-0 transition-all group-hover:bg-foreground/25 group-hover:opacity-100">
          <ExternalLink className="size-5" />
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col p-3.5">
        <div className="flex items-start gap-1.5">
          {editing ? (
            <form
              className="flex flex-1 gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                void saveName();
              }}
            >
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => void saveName()} className="h-7 text-sm" aria-label="Resume name" />
              <Button type="submit" size="icon" variant="ghost" className="size-7" aria-label="Save the name"><Check className="size-3.5" /></Button>
            </form>
          ) : (
            <>
              <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" title={resume.name}>{resume.name}</h3>
              <Button size="icon" variant="ghost" className="size-6 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" aria-label="Rename" onClick={() => setEditing(true)}>
                <Pencil className="size-3" />
              </Button>
            </>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {resume.pages} {resume.pages > 1 ? "pages" : "page"} · {resume.language.toUpperCase()} · {formatSize(resume.size)}
          {added && ` · added ${formatDistanceToNowStrict(added, { addSuffix: true })}`}
        </p>

        <div className="mt-2.5 flex flex-1 flex-wrap content-start gap-1">
          {!resume.has_text ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700">
              <ScanText className="size-3" /> No text layer: cannot be matched
            </span>
          ) : (
            <>
              {shown.map((keyword) => <span key={keyword} className="rounded-md bg-brand-muted px-1.5 py-0.5 text-[11px] text-brand">{keyword}</span>)}
              {resume.keywords.length > shown.length && <span className="px-1 py-0.5 text-[11px] text-muted-foreground">+{resume.keywords.length - shown.length}</span>}
            </>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs" onClick={() => onOpen(resume.id)}>
            <ExternalLink className="size-3.5" /> Open
          </Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs" onClick={() => onReveal(resume.id)}>
            <FolderOpen className="size-3.5" /> Show file
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn("ml-auto h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600", confirming && "bg-rose-500/10 text-rose-600")}
            onClick={() => void remove()}
            disabled={removing}
            aria-label={confirming ? "Confirm removal" : "Remove from the vault"}
          >
            {removing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            {confirming && "Remove?"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

export default VaultCard;
