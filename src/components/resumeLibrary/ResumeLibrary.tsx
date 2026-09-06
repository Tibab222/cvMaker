import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Clock3,
  Copy,
  Download,
  FilePlus2,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResumeKind = "Master Version" | "Tailored";

interface Resume {
  id: string;
  title: string;
  kind: ResumeKind;
  targetRole?: string;
  company?: string;
  match?: number;
  updated: string;
  updatedOrder: number;
  tags: string[];
}

const STARTER_RESUMES: Resume[] = [
  {
    id: "resume-1",
    title: "Senior Frontend Engineer — React / Node",
    kind: "Tailored",
    targetRole: "Senior Frontend Engineer",
    company: "Vercel",
    match: 92,
    updated: "Updated 2 hours ago",
    updatedOrder: 1,
    tags: ["React", "TypeScript", "Node.js"],
  },
  {
    id: "resume-2",
    title: "Fullstack Developer (General)",
    kind: "Master Version",
    targetRole: "General applications",
    match: 84,
    updated: "Updated 2 days ago",
    updatedOrder: 2,
    tags: ["PostgreSQL", "React", "Python"],
  },
  {
    id: "resume-3",
    title: "AI Application Engineer",
    kind: "Tailored",
    targetRole: "AI Application Engineer",
    company: "Anthropic",
    match: 88,
    updated: "Updated 4 days ago",
    updatedOrder: 4,
    tags: ["LLMs", "Python", "RAG"],
  },
  {
    id: "resume-4",
    title: "Backend & Platform Engineer",
    kind: "Tailored",
    targetRole: "Platform Engineer",
    company: "Stripe",
    match: 79,
    updated: "Updated 1 week ago",
    updatedOrder: 7,
    tags: ["Node.js", "AWS", "PostgreSQL"],
  },
  {
    id: "resume-5",
    title: "Systems Engineer — C++ Runtime",
    kind: "Tailored",
    targetRole: "Systems Engineer",
    company: "Nvidia",
    match: 86,
    updated: "Updated 9 days ago",
    updatedOrder: 9,
    tags: ["C++", "CUDA", "Linux"],
  },
  {
    id: "resume-6",
    title: "Software Engineer — Core Profile",
    kind: "Master Version",
    targetRole: "Software Engineer",
    updated: "Updated 2 weeks ago",
    updatedOrder: 14,
    tags: ["TypeScript", "Python", "SQL"],
  },
];

const cardMotion = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.97 },
};

function DocumentPreview({ resume }: { resume: Resume }) {
  return (
    <div className="relative flex h-48 items-center justify-center overflow-hidden border-y border-border/40 bg-muted/35 px-8 py-5">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
      <div className="relative h-full w-32 overflow-hidden rounded-sm border border-border/60 bg-background p-3 shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
        <div className="flex items-start gap-2 border-b border-border/50 pb-2">
          <div className="flex size-6 items-center justify-center rounded-sm bg-primary text-[8px] font-bold text-primary-foreground">
            {resume.title.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 space-y-1 pt-0.5">
            <div className="h-1.5 w-full rounded-full bg-foreground/75" />
            <div className="h-1 w-3/5 rounded-full bg-muted-foreground/45" />
          </div>
        </div>
        <div className="mt-3 space-y-2.5">
          <div>
            <div className="mb-1.5 h-1 w-7 rounded-full bg-primary/70" />
            <div className="space-y-1">
              <div className="h-0.5 w-full rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-11/12 rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-4/5 rounded-full bg-muted-foreground/30" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 h-1 w-10 rounded-full bg-primary/70" />
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
  onDelete: (id: string) => void;
  onDuplicate: (resume: Resume) => void;
  onRename: (id: string, title: string) => void;
}

function ResumeCard({ resume, onDelete, onDuplicate, onRename }: ResumeCardProps) {
  const handleRename = () => {
    const nextTitle = window.prompt("Rename this CV", resume.title)?.trim();
    if (nextTitle) onRename(resume.id, nextTitle);
  };

  return (
    <motion.div layout {...cardMotion} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      <Card className="group flex h-full flex-col overflow-hidden rounded-lg border-border/40 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-border hover:shadow-lg">
        <CardHeader className="min-h-28 p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base leading-6">{resume.title}</CardTitle>
            <Badge
              variant={resume.kind === "Master Version" ? "default" : "secondary"}
              className="shrink-0 whitespace-nowrap"
            >
              {resume.kind === "Master Version" && <Check className="mr-1 size-3" />}
              {resume.kind}
            </Badge>
          </div>
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <BriefcaseBusiness className="size-3.5 shrink-0" />
            <span className="truncate">
              {resume.targetRole ?? "No target role"}{resume.company ? ` · ${resume.company}` : ""}
            </span>
          </div>
        </CardHeader>

        <DocumentPreview resume={resume} />

        <CardContent className="flex flex-1 flex-col gap-4 p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Role affinity</span>
              <span className="font-semibold text-foreground">
                {resume.match ? `${resume.match}% Match` : "Not scored"}
              </span>
            </div>
            <Progress value={resume.match ?? 0} className="h-1.5" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {resume.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="bg-muted/35 font-medium text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            {resume.updated}
          </div>
        </CardContent>

        <CardFooter className="gap-2 border-t border-border/40 p-3">
          <Button
            className="flex-1 justify-between"
            onClick={() => toast.success(`${resume.title} loaded in the editor`)}
          >
            Load in Editor <ArrowRight />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={`More actions for ${resume.title}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => onDuplicate(resume)}>
                <Copy /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast.success("PDF export prepared")}> 
                <Download /> Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleRename}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(resume.id)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default function ResumeLibrary() {
  const [resumes, setResumes] = useState<Resume[]>(STARTER_RESUMES);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("modified");

  const visibleResumes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resumes
      .filter((resume) =>
        [resume.title, resume.targetRole, resume.company, ...resume.tags]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query)),
      )
      .sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "match") return (b.match ?? 0) - (a.match ?? 0);
        return a.updatedOrder - b.updatedOrder;
      });
  }, [resumes, search, sort]);

  const createResume = () => {
    const resume: Resume = {
      id: `resume-${Date.now()}`,
      title: "Untitled CV",
      kind: "Tailored",
      targetRole: "New target role",
      updated: "Updated just now",
      updatedOrder: 0,
      tags: ["New"],
    };
    setResumes((current) => [resume, ...current]);
    setSearch("");
    toast.success("New CV created");
  };

  const duplicateResume = (resume: Resume) => {
    setResumes((current) => [
      { ...resume, id: `resume-${Date.now()}`, title: `${resume.title} — Copy`, kind: "Tailored", updated: "Updated just now", updatedOrder: 0 },
      ...current,
    ]);
    toast.success("CV duplicated");
  };

  const deleteResume = (id: string) => {
    setResumes((current) => current.filter((resume) => resume.id !== id));
    toast.success("CV moved out of your library");
  };

  const renameResume = (id: string, title: string) => {
    setResumes((current) => current.map((resume) => (resume.id === id ? { ...resume, title } : resume)));
    toast.success("CV renamed");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-border/40 bg-muted text-foreground">
                <FileText className="size-5" />
              </div>
              <h1 className="text-3xl font-semibold sm:text-4xl">Resume Library</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Manage, customize, and load your targeted CV versions.
              </p>
            </div>
            <Button size="lg" onClick={createResume}>
              <Plus /> Create New CV
            </Button>
          </div>
        </motion.header>

        <section aria-label="Resume filters" className="mb-6 flex flex-col gap-3 border-y border-border/40 py-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search resumes by title or target role..."
              aria-label="Search resumes"
              className="h-10 pl-9"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-10 w-full sm:w-48" aria-label="Sort resumes">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modified">Last modified</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="match">Match Score</SelectItem>
            </SelectContent>
          </Select>
        </section>

        <AnimatePresence mode="popLayout">
          {visibleResumes.length > 0 ? (
            <motion.section layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Your resumes">
              <AnimatePresence mode="popLayout">
                {visibleResumes.map((resume) => (
                  <ResumeCard
                    key={resume.id}
                    resume={resume}
                    onDelete={deleteResume}
                    onDuplicate={duplicateResume}
                    onRename={renameResume}
                  />
                ))}
              </AnimatePresence>
            </motion.section>
          ) : (
            <motion.section
              key="empty"
              {...cardMotion}
              className="flex min-h-96 flex-col items-center justify-center border border-dashed border-border/60 px-6 py-16 text-center"
            >
              <div className="relative mb-6 flex size-24 items-center justify-center rounded-full bg-muted/60">
                <FileText className="size-10 text-muted-foreground" strokeWidth={1.5} />
                <FilePlus2 className="absolute bottom-2 right-1 size-7 rounded-full bg-background p-1 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">No resumes found</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                {search ? "Try a different search, or start a fresh targeted CV." : "Create a CV to start building your resume library."}
              </p>
              <Button className="mt-6" onClick={createResume}>
                <Plus /> Create your first CV
              </Button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}