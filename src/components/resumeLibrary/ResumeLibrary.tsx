import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowRight, BriefcaseBusiness, Clock3, FileText, FolderOpen, Library, Loader2, Plus, Search, Sparkles, Trash2, Vault } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { mapApplicationToResume, type Resume } from "./mapper";
import { api } from "@/api";
import { Tabs, useUiStore } from "@/store/ui";
import { EASE_OUT } from "@/lib/motion";
import PageHeader from "../general/PageHeader";
import EmptyState from "../general/EmptyState";
import StatusPill from "../dashboard/StatusPill";
import { STATUS_META } from "../dashboard/mapApplicationToJabCard";
import ResumeVault from "./vault/ResumeVault";
import { useVault } from "./vault/useVault";
import { cn } from "@/lib/utils";

type LibraryView = "tailored" | "vault";
const cardMotion = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.97 },
};

function DocumentPreview({ resume }: { resume: Resume }) {
  return (
    <div className="relative flex h-48 items-center justify-center overflow-hidden border-y border-border/40 bg-muted/35 px-8 py-5">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
      <div className="relative h-full w-32 overflow-hidden rounded-sm border border-border/60 bg-background p-3 shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-1 group-hover:shadow-md">
        <div className="flex items-start gap-2 border-b border-border/50 pb-2">
          <div className="flex size-6 items-center justify-center rounded-sm bg-brand text-[8px] font-bold text-brand-foreground">
            {resume.company.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 space-y-1 pt-0.5">
            <div className="h-1.5 w-full rounded-full bg-foreground/75" />
            <div className="h-1 w-3/5 rounded-full bg-muted-foreground/45" />
          </div>
        </div>
        <div className="mt-3 space-y-2.5">
          <div>
            <div className="mb-1.5 h-1 w-7 rounded-full bg-brand/70" />
            <div className="space-y-1">
              <div className="h-0.5 w-full rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-11/12 rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-4/5 rounded-full bg-muted-foreground/30" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 h-1 w-10 rounded-full bg-brand/70" />
            <div className="space-y-1">
              <div className="h-0.5 w-full rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-5/6 rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-full rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-2/3 rounded-full bg-muted-foreground/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResumeCardProps {
  resume: Resume;
  onDelete: (id: string) => Promise<void>;
  onLoadResume: (id: string) => void;
}

function ResumeCard({ resume, onDelete, onLoadResume }: ResumeCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = STATUS_META[resume.status];

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    await onDelete(resume.id);
    setDeleting(false);
    setConfirming(false);
  };

  const showPdf = async () => {
    const opened = await api.openResumeFolder(resume.id);
    if (!opened) toast.error("The exported PDF was moved or deleted.");
  };

  return (
    <motion.div layout {...cardMotion} transition={{ duration: 0.28, ease: EASE_OUT }}>
      <Card className="group flex h-full flex-col gap-0 overflow-hidden rounded-xl border-border/60 py-0 shadow-xs transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5">
        <CardHeader className="min-h-24 p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base leading-6">{resume.company}</CardTitle>
            {meta && <StatusPill label={meta.label} tone={meta.tone} className="shrink-0" />}
          </div>
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <BriefcaseBusiness className="size-3.5 shrink-0" />
            <span className="truncate">{resume.targetRole || "No target role"}</span>
          </div>
        </CardHeader>

        <DocumentPreview resume={resume} />

        <CardContent className="flex flex-1 flex-col gap-4 p-5">
          {resume.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {resume.tags.slice(0, 6).map((tag) => (
                <Badge key={tag} variant="outline" className="bg-muted/35 font-medium text-muted-foreground">
                  {tag}
                </Badge>
              ))}
              {resume.tags.length > 6 && <Badge variant="outline" className="text-muted-foreground">+{resume.tags.length - 6}</Badge>}
            </div>
          )}

          <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground" title={resume.updated ? format(resume.updated, "PPpp") : undefined}>
            <Clock3 className="size-3.5" />
            {resume.updated ? `Updated ${formatDistanceToNowStrict(resume.updated, { addSuffix: true })}` : "Never updated"}
          </div>
        </CardContent>

        <CardFooter className="gap-2 border-t border-border/40 p-3">
          <Button className="flex-1 justify-between" onClick={() => onLoadResume(resume.id)}>
            Open in editor <ArrowRight />
          </Button>
          <TooltipProvider>
            {resume.hasPdf && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={showPdf} aria-label="Show exported PDF">
                    <FolderOpen />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show exported PDF</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={confirming ? "destructive" : "outline"}
                  size={confirming ? "default" : "icon"}
                  onClick={handleDelete}
                  onBlur={() => setConfirming(false)}
                  disabled={deleting}
                  aria-label="Delete this application and its resume"
                >
                  {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  {confirming && "Confirm"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{confirming ? "Click again: deletes the application and its history" : "Delete"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default function ResumeLibrary() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const { setSelectedTab, loadCvSession } = useUiStore();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("modified");
  const [view, setView] = useState<LibraryView>("tailored");
  const vault = useVault();
  const vaultCount = vault.resumes?.length ?? 0;

  useEffect(() => {
    api.getApplications()
      .then((applications) => setResumes(applications.map(mapApplicationToResume)))
      .catch(() => toast.error("Could not load your resumes"))
      .finally(() => setLoading(false));
  }, []);

  const visibleResumes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resumes
      .filter((resume) =>
        [resume.company, resume.targetRole, ...resume.tags]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query)),
      )
      .sort((a, b) => {
        if (sort === "title") return a.company.localeCompare(b.company);
        return (b.updated?.getTime() ?? 0) - (a.updated?.getTime() ?? 0);
      });
  }, [resumes, search, sort]);

  const createResume = () => {
    loadCvSession(""); // Load a new CV session
    setSelectedTab(Tabs.CVMAKER);
  };

  const deleteResume = async (id: string) => {
    try {
      const deleted = await api.deleteApplication(id);
      if (!deleted) throw new Error("not found");
      setResumes((current) => current.filter((resume) => resume.id !== id));
      toast.success("Resume and application deleted");
    } catch {
      toast.error("Could not delete this resume");
    }
  };

  const onLoadResume = (id: string) => {
    loadCvSession(id);
    setSelectedTab(Tabs.CVMAKER);
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      <PageHeader
        icon={Library}
        title="Resume library"
        description={
          view === "vault"
            ? "Your finished PDF resumes, ranked against each offer"
            : resumes.length ? `${resumes.length} tailored resume${resumes.length > 1 ? "s" : ""}` : "Every resume you tailored for an offer"
        }
        actions={
          <Button size="sm" onClick={createResume} className="gap-1.5 shadow-sm shadow-brand/20">
            <Plus className="size-4" /> New resume
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <section aria-label="Resume filters" className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="tablist" aria-label="Library view" className="flex shrink-0 rounded-lg bg-muted p-1">
            {([
              { id: "tailored", label: "Tailored", icon: Sparkles, count: resumes.length },
              { id: "vault", label: "Vault", icon: Vault, count: vaultCount },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={view === tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  "relative flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                  view === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {view === tab.id && <motion.span layoutId="library-view" className="absolute inset-0 rounded-md bg-background shadow-sm" transition={{ duration: 0.22, ease: EASE_OUT }} />}
                <tab.icon className="relative size-3.5" />
                <span className="relative">{tab.label}</span>
                {tab.count > 0 && <span className="relative text-xs tabular-nums text-muted-foreground">{tab.count}</span>}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={view === "vault" ? "Search by name or keyword…" : "Search by company, role or keyword…"}
              aria-label="Search resumes"
              className="h-10 bg-surface-elevated pl-9"
            />
          </div>
          {view === "tailored" && <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-10 w-full bg-surface-elevated sm:w-48" aria-label="Sort resumes">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modified">Last modified</SelectItem>
              <SelectItem value="title">Company</SelectItem>
            </SelectContent>
          </Select>}
        </section>

        {view === "vault" ? (
          <ResumeVault vault={vault} search={search} />
        ) : loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-96 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : visibleResumes.length > 0 ? (
          <motion.section layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Your resumes">
            <AnimatePresence mode="popLayout">
              {visibleResumes.map((resume) => (
                <ResumeCard key={resume.id} resume={resume} onDelete={deleteResume} onLoadResume={onLoadResume} />
              ))}
            </AnimatePresence>
          </motion.section>
        ) : (
          <EmptyState
            icon={FileText}
            title={search ? "No resume matches your search" : "No resume yet"}
            description={search ? "Try another company, role or keyword." : "Paste a job offer in the editor and tailor your first resume for it."}
            action={
              <Button onClick={createResume} className="gap-1.5">
                <Plus className="size-4" /> {search ? "New resume" : "Create your first resume"}
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
