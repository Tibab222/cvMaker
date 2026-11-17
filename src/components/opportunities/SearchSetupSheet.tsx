import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Building2, Check, Clock, Filter, Loader2, Moon, Pencil, Plus, ShieldCheck, Telescope, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { joinList, KIND_STYLE, splitList } from "@/lib/opportunities";
import {
  JobSourceKind,
  STARTER_BOARDS,
  type DiscoveryFiltersMode,
  type DiscoverySettings,
  type ProfileFilterSuggestion,
} from "@shared/discovery.types";
import { errorMessage, type DiscoveryState } from "./useDiscovery";
import { SourceRow } from "./SourceRow";
import MarketSearch from "./MarketSearch";

const AGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "0", label: "Any date" },
];

function Section({ icon: Icon, title, description, children }: { icon: typeof Filter; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-brand" /> {title}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** One-click boards to start with. Hidden once followed. */
export function StarterBoards({ discovery, className }: { discovery: DiscoveryState; className?: string }) {
  const [pending, setPending] = useState<string | null>(null);
  const followed = new Set(discovery.sources.map((source) => `${source.kind}:${source.token}`));
  const groups = [
    { region: "canada", title: "Hiring in Canada" },
    { region: "global", title: "Worldwide" },
  ] as const;

  const follow = async (key: string, label: string) => {
    setPending(key);
    try {
      await discovery.addSource(key);
      toast.success(`Following ${label}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      {groups.map(({ region, title }) => {
        const boards = STARTER_BOARDS.filter((board) => board.region === region && !followed.has(`${board.kind}:${board.token}`));
        if (boards.length === 0) return null;
        return (
          <div key={region}>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence initial={false} mode="popLayout">
                {boards.map((board) => {
                  const key = `${board.kind}:${board.token}`;
                  return (
                    <motion.button
                      key={key}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      type="button"
                      disabled={pending !== null}
                      onClick={() => void follow(key, board.label)}
                      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-brand/50 hover:bg-brand-muted hover:text-brand disabled:opacity-60"
                    >
                      {pending === key ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      {board.label}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SourcesSection({ discovery }: { discovery: DiscoveryState }) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!input.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const source = await discovery.addSource(input);
      setInput("");
      toast.success(`Following ${source.label} (${KIND_STYLE[source.kind].label})`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <Section
      icon={Building2}
      title="Companies you follow"
      description="Type a company name or paste its careers page: CV Maker finds its public job board (Greenhouse, Lever or Ashby) and reads it directly. No scraping, no account."
    >
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <Input
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError(null);
          }}
          placeholder="Wealthsimple, or https://company.com/careers"
          aria-invalid={!!error}
          className="flex-1"
        />
        <Button type="submit" disabled={adding || !input.trim()} className="gap-1.5">
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {adding ? "Looking…" : "Follow"}
        </Button>
      </form>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-1.5 text-xs text-rose-600">
            <AlertCircle className="mt-px size-3.5 shrink-0" /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      <ul className="space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {discovery.sources
            .filter((source) => source.kind !== JobSourceKind.ADZUNA)
            .map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                onToggle={(id, enabled) => void discovery.toggleSource(id, enabled)}
                onRemove={(id) => void discovery.removeSource(id)}
              />
            ))}
        </AnimatePresence>
      </ul>

      <StarterBoards discovery={discovery} className="pt-1" />
    </Section>
  );
}

interface Draft {
  filtersMode: DiscoveryFiltersMode;
  titleIncludes: string;
  titleExcludes: string;
  locations: string;
  remoteOnly: boolean;
  maxAgeDays: string;
  scheduleEnabled: boolean;
  hour: string;
}

const toDraft = (settings: DiscoverySettings): Draft => ({
  filtersMode: settings.filtersMode,
  titleIncludes: joinList(settings.filters.titleIncludes),
  titleExcludes: joinList(settings.filters.titleExcludes),
  locations: joinList(settings.filters.locations),
  remoteOnly: settings.filters.remoteOnly,
  maxAgeDays: String(settings.filters.maxAgeDays),
  scheduleEnabled: settings.schedule.enabled,
  hour: String(settings.schedule.hour),
});

const fromDraft = (draft: Draft): DiscoverySettings => ({
  filtersMode: draft.filtersMode,
  filters: {
    titleIncludes: splitList(draft.titleIncludes),
    titleExcludes: splitList(draft.titleExcludes),
    locations: splitList(draft.locations),
    remoteOnly: draft.remoteOnly,
    maxAgeDays: Number(draft.maxAgeDays),
  },
  schedule: { enabled: draft.scheduleEnabled, hour: Number(draft.hour) },
});

function Chips({ values, empty, max = 12, tone = "default" }: { values: string[]; empty: string; max?: number; tone?: "default" | "muted" }) {
  if (values.length === 0) return <p className="text-xs italic text-muted-foreground">{empty}</p>;
  const shown = values.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((value) => (
        <span
          key={value}
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[11px]",
            tone === "muted" ? "bg-muted text-muted-foreground line-through decoration-muted-foreground/40" : "bg-brand-muted text-brand",
          )}
        >
          {value}
        </span>
      ))}
      {values.length > max && <span className="px-1 py-0.5 text-[11px] text-muted-foreground">+{values.length - max}</span>}
    </div>
  );
}

function ProfileFilters({ suggestion, onCustomize }: { suggestion: ProfileFilterSuggestion | null; onCustomize: () => void }) {
  if (!suggestion) {
    return (
      <div className="space-y-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        <p>Add your experiences to the profile and CV Maker works out what to look for. Until then every offer is kept, ranked by how well it matches your skills.</p>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={onCustomize}>
          <Pencil className="size-3" /> Set filters myself
        </Button>
      </div>
    );
  }
  const origin = [
    suggestion.fromTitles.length > 0 && `your roles as ${suggestion.fromTitles.join(", ")}`,
    suggestion.yearsOfExperience !== null && `${suggestion.yearsOfExperience} ${suggestion.yearsOfExperience === 1 ? "year" : "years"} of experience`,
  ].filter(Boolean).join(" and ");

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-card p-3">
      {origin && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <UserRound className="mt-px size-3.5 shrink-0 text-brand" /> Based on {origin}. Updated whenever your profile changes.
        </p>
      )}
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">Titles with</p>
        <Chips values={suggestion.filters.titleIncludes} empty="Any title" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">Skipped</p>
        <Chips values={suggestion.filters.titleExcludes} empty="Nothing skipped" tone="muted" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">Around</p>
        <Chips values={suggestion.filters.locations} empty="Anywhere (no location in your experiences)" />
        <p className="text-[11px] text-muted-foreground">Remote offers are always kept.</p>
      </div>
      <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={onCustomize}>
        <Pencil className="size-3" /> Customize
      </Button>
    </div>
  );
}

const MODES: { id: DiscoveryFiltersMode; label: string }[] = [
  { id: "profile", label: "From my profile" },
  { id: "custom", label: "Custom" },
];

function SettingsForm({ discovery, settings }: { discovery: DiscoveryState; settings: DiscoverySettings }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(fromDraft(draft)) !== JSON.stringify(settings);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const { suggestion } = discovery;

  /** Custom filters start from the profile's, so customizing means adjusting, not starting over. */
  const customize = () =>
    setDraft((current) => {
      const empty = !current.titleIncludes && !current.titleExcludes && !current.locations;
      return {
        ...current,
        filtersMode: "custom",
        ...(empty && suggestion
          ? {
              titleIncludes: joinList(suggestion.filters.titleIncludes),
              titleExcludes: joinList(suggestion.filters.titleExcludes),
              locations: joinList(suggestion.filters.locations),
            }
          : {}),
      };
    });

  const save = async () => {
    setSaving(true);
    try {
      await discovery.saveSettings(fromDraft(draft));
      toast.success("Search settings saved");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Section icon={Filter} title="What you are looking for" description="Offers that do not pass these filters are skipped; the others are ranked by how well they match your profile.">
        <nav className="flex gap-1 rounded-lg bg-muted p-1" aria-label="Filters source">
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => (id === "custom" ? customize() : set("filtersMode", "profile"))}
              aria-pressed={draft.filtersMode === id}
              className={cn(
                "relative z-10 flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                draft.filtersMode === id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {draft.filtersMode === id && (
                <motion.span layoutId="filters-mode" className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
              )}
              {label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={draft.filtersMode} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
            {draft.filtersMode === "profile" ? (
              <ProfileFilters suggestion={suggestion} onCustomize={customize} />
            ) : (
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="f-include" className="text-xs">Title contains one of (whole words, commas between)</Label>
                  <Input id="f-include" value={draft.titleIncludes} onChange={(e) => set("titleIncludes", e.target.value)} placeholder="developer, engineer, développeur" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-exclude" className="text-xs">Title contains none of</Label>
                  <Input id="f-exclude" value={draft.titleExcludes} onChange={(e) => set("titleExcludes", e.target.value)} placeholder="intern, director" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-location" className="text-xs">Location contains one of (remote offers always pass)</Label>
                  <Input id="f-location" value={draft.locations} onChange={(e) => set("locations", e.target.value)} placeholder="Montréal, Toronto, Canada" />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="f-remote" className="text-xs">Remote only</Label>
            <Switch id="f-remote" checked={draft.remoteOnly} onCheckedChange={(checked) => set("remoteOnly", checked)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs">Published</Label>
            <Select value={draft.maxAgeDays} onValueChange={(value) => set("maxAgeDays", value)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section icon={Moon} title="Nightly search" description="CV Maker searches every day at that hour while it is open. If the computer was off, the search runs the next time you open the app.">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={draft.scheduleEnabled} onCheckedChange={(checked) => set("scheduleEnabled", checked)} aria-label="Enable the nightly search" />
            <span className={draft.scheduleEnabled ? "text-foreground" : "text-muted-foreground"}>Search every day at</span>
          </div>
          <Select value={draft.hour} onValueChange={(value) => set("hour", value)} disabled={!draft.scheduleEnabled}>
            <SelectTrigger className="w-24"><Clock className="size-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, hour) => (
                <SelectItem key={hour} value={String(hour)}>{String(hour).padStart(2, "0")}:00</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-emerald-600" />
          Each site gets at most one request every 45 to 70 seconds, never two in a row, and the search slows down when a site asks. Nothing is ever sent to an employer: you review and apply yourself.
        </p>
      </Section>

      <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-2 border-t border-border/70 bg-background/90 px-5 py-3 backdrop-blur">
        <AnimatePresence>
          {dirty && (
            <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mr-auto text-xs text-amber-700">
              Unsaved changes
            </motion.span>
          )}
        </AnimatePresence>
        <Button onClick={() => void save()} disabled={!dirty || saving} className="gap-1.5">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save
        </Button>
      </div>
    </>
  );
}

export default function SearchSetupSheet({ open, onOpenChange, discovery }: { open: boolean; onOpenChange: (open: boolean) => void; discovery: DiscoveryState }) {
  const { refreshSuggestion } = discovery;
  useEffect(() => {
    if (open) void refreshSuggestion();
  }, [open, refreshSuggestion]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 border-border/70 bg-background/95 p-0 text-foreground backdrop-blur-xl data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle>Search setup</SheetTitle>
          <SheetDescription>Where to look, what to keep, and when to search.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-7 overflow-y-auto px-5 pt-5">
          <Section
            icon={Telescope}
            title="Search the whole job market"
            description="Keyword searches on Adzuna, which gathers offers from thousands of sites: banks, large companies, agencies. Run with the rest, at night or on demand."
          >
            <MarketSearch discovery={discovery} />
          </Section>
          <SourcesSection discovery={discovery} />
          {/* remounted on open so the form starts from the saved settings */}
          {discovery.settings && open && <SettingsForm key={JSON.stringify(discovery.settings)} discovery={discovery} settings={discovery.settings} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
