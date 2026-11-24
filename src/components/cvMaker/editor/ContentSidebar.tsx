import { type ComponentType, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlignLeft, BookOpen, Briefcase, FolderKanban, IdCard, Layers, Target, Wrench, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getModifierKeyLabel } from "@/hooks/use-keyboard-shortcut";
import { useProfileStore } from "@/store/profile";
import { useTemplateStore } from "@/store/templates";
import { useCVSelection } from "../provider/hook";
import HeaderPicker from "../cvPicker/HeaderPicker";
import SummaryPicker from "../cvPicker/SummaryPicker";
import ExperiencePicker from "../cvPicker/ExperiencePicker";
import ProjectPicker from "../cvPicker/ProjectPicker";
import SkillsPicker from "../cvPicker/SkillsPicker";
import EducationPicker from "../cvPicker/EducationPicker";
import CollectionPicker from "../cvPicker/CollectionPicker";
import Analyse from "../cvPicker/Analyse";
import type { EditorView } from "./EditorTopBar";

const PANEL_WIDTH = 380;

interface Section {
  id: string;
  /** Short name under the rail icon. */
  label: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  /** Items on the resume, shown as a badge on the rail. */
  count?: number;
  /** A small dot on the rail (e.g. the job was analysed). */
  dot?: boolean;
  content: ReactNode;
}

/** What the rail offers for the document shown: the resume parts, then the job. */
const useSections = (view: EditorView): { content: Section[]; job: Section } => {
  const { experience, projects, skills, education, profile } = useProfileStore();
  const { selection, showSummary, templateId, jobInfos } = useCVSelection();
  const collections = Object.entries(useTemplateStore((state) => state.get(templateId)).template.meta.collections ?? {});
  const header = selection.headerInfos;

  const job: Section = {
    id: "job",
    label: "Job",
    title: "Job match",
    description: "The offer you apply to: analyse it to score and pick your best items.",
    icon: Target,
    dot: Boolean(jobInfos?.keywords?.length),
    content: <Analyse />,
  };
  if (view !== "resume") return { content: [], job };

  const countIn = (ids: string[], items: { id: string }[]) => items.filter((item) => ids.includes(item.id)).length;
  const contactKeys = ["mail", "phone", "portfolio", "linkedin", "github", "twitter", "instagram", "tiktok", "youtube", "facebook"] as const;

  const content: Section[] = [
    {
      id: "header",
      label: "Header",
      title: "Header",
      description: "Headline, photo and the contact details shown under your name.",
      icon: IdCard,
      count: contactKeys.filter((key) => header[key] && profile?.[key]?.trim()).length
        + (profile?.customLinks ?? []).filter((link) => header.customLinks?.[link.label]).length,
      content: <HeaderPicker />,
    },
    {
      id: "summary",
      label: "Summary",
      title: "Summary",
      description: "A short pitch at the top of the resume.",
      icon: AlignLeft,
      dot: showSummary,
      content: <SummaryPicker />,
    },
    {
      id: "experience",
      label: "Experience",
      title: "Experience",
      description: "The positions to show.",
      icon: Briefcase,
      count: countIn(selection.selectedExpIds, experience),
      content: <ExperiencePicker />,
    },
    {
      id: "projects",
      label: "Projects",
      title: "Projects",
      description: "The projects to show, and which of their bullets.",
      icon: FolderKanban,
      count: countIn(selection.selectedProjectIds, projects),
      content: <ProjectPicker />,
    },
    {
      id: "skills",
      label: "Skills",
      title: "Skills",
      description: "The skills to list, grouped by category.",
      icon: Wrench,
      count: countIn(selection.selectedSkillsIds, skills),
      content: <SkillsPicker />,
    },
    {
      id: "education",
      label: "Education",
      title: "Education",
      description: "Degrees, certifications and courses.",
      icon: BookOpen,
      count: countIn(selection.selectedEducationIds, education),
      content: <EducationPicker />,
    },
    // parts the template asks for (e.g. a project appendix)
    ...collections.map(([name, collection]): Section => ({
      id: `collection:${name}`,
      label: collection.label,
      title: collection.label,
      description: "A part of the current template.",
      icon: Layers,
      count: selection.collections?.[name]?.length ?? 0,
      content: <CollectionPicker name={name} collection={collection} />,
    })),
  ];
  return { content, job };
};

function RailButton({ section, active, onClick }: { section: Section; active: boolean; onClick: () => void }) {
  const Icon = section.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          className={cn(
            "group relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
            active ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span className="relative">
            <Icon className="size-5" />
            {section.count !== undefined && section.count > 0 && (
              <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold leading-none text-brand-foreground tabular-nums">
                {section.count}
              </span>
            )}
            {section.dot && (section.count === undefined) && (
              <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            )}
          </span>
          <span className="w-full truncate text-center">{section.label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{section.description}</TooltipContent>
    </Tooltip>
  );
}

interface Props {
  view: EditorView;
  /** Id of the open section, or null when the panel is closed. */
  active: string | null;
  onActiveChange: (id: string | null) => void;
}

/**
 * What goes on the resume: a rail of the resume parts on the right edge, and the panel of the part picked,
 * docked beside the page (the page stays visible and is re-fitted, nothing covers it).
 */
export default function ContentSidebar({ view, active, onActiveChange }: Props) {
  const { content, job } = useSections(view);
  const all = [...content, job];
  const current = all.find((section) => section.id === active) ?? null;
  const toggle = (id: string) => onActiveChange(active === id ? null : id);

  return (
    <>
      <AnimatePresence initial={false}>
        {current && (
          <motion.aside
            key="panel"
            // the width is not animated: the page is re-fitted once, instead of on every frame of a slide
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 overflow-hidden border-l bg-background"
            style={{ width: PANEL_WIDTH }}
            aria-label={current.title}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start gap-3 border-b px-4 py-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <current.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold leading-tight">{current.title}</h2>
                  <p className="text-xs text-muted-foreground">{current.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onActiveChange(null)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close the panel"
                  title={`Close (${getModifierKeyLabel()}+K)`}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4" key={current.id}>
                {current.content}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <nav aria-label="Resume content" className="flex w-[76px] shrink-0 flex-col gap-1 overflow-y-auto border-l bg-background px-1.5 py-3">
        {content.map((section) => (
          <RailButton key={section.id} section={section} active={active === section.id} onClick={() => toggle(section.id)} />
        ))}
        {content.length > 0 && <div className="mx-3 my-2 h-px bg-border" />}
        <RailButton section={job} active={active === job.id} onClick={() => toggle(job.id)} />
      </nav>
    </>
  );
}
