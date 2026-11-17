import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ExternalLink, Globe2, KeyRound, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ADZUNA_COUNTRIES, JobSourceKind, type AdzunaQuery, type JobSource, type ProfileFilterSuggestion } from "@shared/discovery.types";
import { SourceRow } from "./SourceRow";
import { errorMessage, type DiscoveryState } from "./useDiscovery";

const SIGNUP_URL = "https://developer.adzuna.com/signup";

/** Country of the search, from where the candidate worked last. */
const COUNTRY_HINTS: [RegExp, string][] = [
  [/canada|qu[ée]bec|ontario|alberta|british columbia|montr[ée]al|toronto|vancouver|ottawa|calgary|\b(QC|ON|BC|AB)\b/i, "ca"],
  [/france|paris|lyon|marseille|toulouse|bordeaux|lille|nantes/i, "fr"],
  [/united kingdom|\buk\b|england|london|manchester|edinburgh/i, "gb"],
  [/belgi|bruxelles|brussels/i, "be"],
  [/suisse|switzerland|gen[eè]ve|z[uü]rich|lausanne/i, "ch"],
  [/germany|deutschland|berlin|munich|m[uü]nchen/i, "de"],
  [/united states|\busa?\b|new york|san francisco|seattle|boston/i, "us"],
];

function guessCountry(suggestion: ProfileFilterSuggestion | null): string {
  const text = suggestion?.fromLocations.join(" ") ?? "";
  return COUNTRY_HINTS.find(([pattern]) => pattern.test(text))?.[1] ?? "us";
}

/** Saved searches keep their own words: decode them for the row (country shown next to the label). */
function countryOf(source: JobSource): string | null {
  try {
    const [country] = JSON.parse(source.token) as string[];
    return ADZUNA_COUNTRIES.find((entry) => entry.code === country)?.label ?? null;
  } catch {
    return null;
  }
}

function ConnectCard({ discovery }: { discovery: DiscoveryState }) {
  const [appId, setAppId] = useState("");
  const [appKey, setAppKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      await discovery.connectAdzuna(appId, appKey);
      toast.success("Adzuna connected");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-card p-3">
      <ol className="space-y-1.5 text-xs text-muted-foreground">
        <li>
          <span className="mr-1 font-medium text-foreground">1.</span>
          Create a free account on{" "}
          <a href={SIGNUP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-brand hover:underline">
            developer.adzuna.com <ExternalLink className="size-3" />
          </a>{" "}
          (personal job search is an allowed use).
        </li>
        <li><span className="mr-1 font-medium text-foreground">2.</span>Paste the App ID and App key from its dashboard. They stay on this computer.</li>
      </ol>
      <form
        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void connect();
        }}
      >
        <Input value={appId} onChange={(e) => { setAppId(e.target.value); setError(null); }} placeholder="App ID" aria-label="Adzuna App ID" autoComplete="off" />
        <Input value={appKey} onChange={(e) => { setAppKey(e.target.value); setError(null); }} placeholder="App key" aria-label="Adzuna App key" type="password" autoComplete="off" />
        <Button type="submit" disabled={busy || !appId.trim() || !appKey.trim()} className="gap-1.5">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Connect
        </Button>
      </form>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-1.5 text-xs text-rose-600">
            <AlertCircle className="mt-px size-3.5 shrink-0" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchForm({ discovery }: { discovery: DiscoveryState }) {
  const { suggestion } = discovery;
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState(() => suggestion?.filters.locations[0] ?? "");
  const [country, setCountry] = useState(() => guessCountry(suggestion));
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const followed = new Set(discovery.sources.filter((s) => s.kind === JobSourceKind.ADZUNA).map((s) => s.token));
  const tokenOf = (query: AdzunaQuery) => JSON.stringify([query.country, query.what.trim().toLowerCase(), query.where.trim().toLowerCase()]);
  // one-click ideas: the candidate's own recent titles, around where they worked
  const ideas: AdzunaQuery[] = (suggestion?.fromTitles ?? [])
    .map((title) => ({ country: guessCountry(suggestion), what: title, where: suggestion?.filters.locations[0] ?? "" }))
    .filter((idea) => !followed.has(tokenOf(idea)));

  const add = async (query: AdzunaQuery, key: string) => {
    setPending(key);
    setError(null);
    try {
      const source = await discovery.addSearch(query);
      if (key === "form") setWhat("");
      toast.success(`Search added: ${source.label}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add({ country, what, where }, "form");
        }}
      >
        <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
          <div className="space-y-1">
            <Label htmlFor="adz-what" className="text-xs">Looking for</Label>
            <Input id="adz-what" value={what} onChange={(e) => { setWhat(e.target.value); setError(null); }} placeholder="devops, développeur full stack…" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adz-where" className="text-xs">Around (optional)</Label>
            <Input id="adz-where" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Montréal" />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="flex-1" aria-label="Country"><Globe2 className="size-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {ADZUNA_COUNTRIES.map((entry) => <SelectItem key={entry.code} value={entry.code}>{entry.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={pending !== null || !what.trim()} className="gap-1.5">
            {pending === "form" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Add search
          </Button>
        </div>
      </form>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-1.5 text-xs text-rose-600">
            <AlertCircle className="mt-px size-3.5 shrink-0" /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      {ideas.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">From your profile</p>
          <div className="flex flex-wrap gap-1.5">
            {ideas.map((idea) => {
              const key = tokenOf(idea);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void add(idea, key)}
                  className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-brand/50 hover:bg-brand-muted hover:text-brand disabled:opacity-60"
                >
                  {pending === key ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                  {idea.what}{idea.where && <span className="text-muted-foreground">· {idea.where}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Keyword searches over the whole market, through the user's own Adzuna key. */
export default function MarketSearch({ discovery }: { discovery: DiscoveryState }) {
  const searches = discovery.sources.filter((source) => source.kind === JobSourceKind.ADZUNA);
  const status = discovery.adzuna;

  return (
    <>
      {status === null ? null : status.connected ? <SearchForm discovery={discovery} /> : <ConnectCard discovery={discovery} />}

      {searches.length > 0 && (
        <ul className="space-y-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {searches.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                extra={countryOf(source) ?? undefined}
                onToggle={(id, enabled) => void discovery.toggleSource(id, enabled)}
                onRemove={(id) => void discovery.removeSource(id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {status?.connected && (
        <p className="text-[11px] text-muted-foreground">
          Connected to Adzuna{status.appId ? ` (App ID ${status.appId.slice(0, 4)}…)` : ""} · results include banks, large companies and agencies; descriptions are short previews.{" "}
          <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={() => void discovery.disconnectAdzuna()}>
            Disconnect
          </button>
        </p>
      )}
    </>
  );
}
