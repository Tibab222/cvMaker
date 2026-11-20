import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Vault } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import type { VaultMatch, VaultOffer } from "@shared/vault.types";
import { errorMessage } from "../../opportunities/useDiscovery";
import { VaultMatchRow } from "./VaultMatchPanel";

const SHOWN = 2;

/**
 * In an offer: the resumes of the vault that already fit it, so a new one is generated only when needed.
 * Hidden while the vault is empty. Ranked once per mount: give it a `key` per offer.
 */
export default function VaultSuggestion({ offer }: { offer: VaultOffer }) {
  const [matches, setMatches] = useState<VaultMatch[] | null>(null);
  const [initial] = useState(offer);

  useEffect(() => {
    let alive = true;
    api.vault
      .match(initial, SHOWN)
      .then((result) => alive && setMatches(result))
      .catch(() => alive && setMatches([]));
    return () => {
      alive = false;
    };
  }, [initial]);

  const open = (id: string) => api.vault.open(id).catch((error) => toast.error(errorMessage(error)));

  return (
    <AnimatePresence>
      {matches && matches.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} aria-label="Resumes of your vault for this offer">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Vault className="size-3.5" /> From your vault
            {matches[0].score >= 70 && <span className="font-normal">· no need to generate a new one</span>}
          </p>
          <ul className="space-y-2">
            {matches.map((match, index) => <VaultMatchRow key={match.resume_id} match={match} onOpen={open} best={index === 0 && match.score >= 45} />)}
          </ul>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
