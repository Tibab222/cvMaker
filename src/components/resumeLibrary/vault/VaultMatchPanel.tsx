import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { scoreTone } from "@/lib/opportunities";
import type { VaultMatch } from "@shared/vault.types";
import ScoreRing from "../../opportunities/ScoreRing";
import { errorMessage } from "../../opportunities/useDiscovery";

/** One ranked resume: score, why, what the offer asks that this resume does not show. */
export function VaultMatchRow({ match, onOpen, best }: { match: VaultMatch; onOpen: (id: string) => void; best?: boolean }) {
  const tone = scoreTone(match.score);
  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3 rounded-lg border border-border/70 bg-card p-3">
      <ScoreRing score={match.score} size={44} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="truncate">{match.name}</span>
          {best && <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold text-emerald-700">Best fit</span>}
        </p>
        <p className={`text-[11px] ${tone.text}`}>{tone.label}</p>
        {(match.matched.length > 0 || match.missing.length > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {match.matched.slice(0, 6).map((keyword) => <span key={keyword} className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-700">{keyword}</span>)}
            {match.missing.slice(0, 4).map((keyword) => <span key={keyword} className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700" title="Asked by the offer, not in this resume">{keyword}</span>)}
          </div>
        )}
      </div>
      <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label={`Open ${match.name}`} onClick={() => onOpen(match.resume_id)}>
        <ExternalLink className="size-4" />
      </Button>
    </motion.li>
  );
}

/** "Which of my resumes fits this offer?": paste an offer, get the vault ranked. */
export default function VaultMatchPanel({ onOpen, disabled }: { onOpen: (id: string) => void; disabled: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [matches, setMatches] = useState<VaultMatch[] | null>(null);
  const [busy, setBusy] = useState(false);

  const rank = async () => {
    setBusy(true);
    try {
      setMatches(await api.vault.match({ title, description }));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4" aria-label="Find the best resume for an offer">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Target className="size-4 text-brand" /> Which resume for this offer?
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Paste an offer: your vault is ranked with the same scoring as Opportunities, on this computer.</p>
      <form
        className="mt-3 grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void rank();
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title (e.g. DevOps Engineer)" aria-label="Job title" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste the offer here…" rows={5} className="resize-y text-sm" aria-label="Offer" />
        <Button type="submit" disabled={disabled || busy || (!title.trim() && !description.trim())} className="justify-self-start gap-1.5">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Target className="size-4" />} Rank my resumes
        </Button>
      </form>

      <AnimatePresence>
        {matches && (
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-2">
            {matches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No resume with readable text to rank yet.</p>
            ) : (
              matches.map((match, index) => <VaultMatchRow key={match.resume_id} match={match} onOpen={onOpen} best={index === 0 && match.score >= 45} />)
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}
