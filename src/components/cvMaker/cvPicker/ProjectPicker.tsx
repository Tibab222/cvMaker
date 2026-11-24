import { AnimatePresence, motion } from "framer-motion";
import { useProfileStore } from "@/store/profile";
import { Tabs } from "@/store/ui";
import { cn } from "@/lib/utils";
import { findRelatedExperience, formatProjectPeriod, localeForLanguage } from "@shared/projectDates";
import type { Project } from "@shared/projects.interface";
import { useCVSelection } from "../provider/hook";
import KeywordChips from "./KeywordChips";
import { EmptyProfile, PickBox, PickRow, ScoreBadge, SelectionBar } from "./PickerParts";

export default function ProjectPicker() {
  const { projects, experience, profile } = useProfileStore();
  const { toggleProject, selection, toggleBullet, getScore, getKeywords, getCustomField } = useCVSelection();
  const picked = selection.selectedProjectIds;

  if (projects.length === 0) return <EmptyProfile what="projects" tab={Tabs.PROJECTS} />;

  const pickedBullets = (project: Project) => selection.selectedBullets[project.id] ?? [];

  /** A project only shows on the resume with bullets: picking one with none picked takes all of them. */
  const toggle = (project: Project) => {
    const isPicked = picked.includes(project.id);
    toggleProject(project.id);
    if (!isPicked && pickedBullets(project).length === 0) project.bullets.forEach((bullet) => toggleBullet(project.id, bullet.id));
  };

  return (
    <div className="space-y-3">
      <SelectionBar
        selected={projects.filter((project) => picked.includes(project.id)).length}
        total={projects.length}
        onAll={() => projects.filter((project) => !picked.includes(project.id)).forEach(toggle)}
        onNone={() => projects.filter((project) => picked.includes(project.id)).forEach(toggle)}
      />
      <p className="text-[11px] text-muted-foreground">Pick a project, then the bullets to show. Order = the order you pick them.</p>
      <div className="space-y-2">
        {projects.map((project) => {
          const order = picked.indexOf(project.id);
          const isPicked = order !== -1;
          const bullets = pickedBullets(project);
          const keywords = getKeywords("project", project.id);
          const company = findRelatedExperience(project, experience)?.company;
          const period = formatProjectPeriod(project, localeForLanguage(profile?.language), profile?.language === "fr" ? "Présent" : "Present");

          return (
            <PickRow
              key={project.id}
              selected={isPicked}
              order={isPicked ? order : undefined}
              onToggle={() => toggle(project)}
              title={getCustomField("project", project.id, "title", project.title) || "Untitled project"}
              subtitle={getCustomField("project", project.id, "subtitle", project.subtitle ?? "")}
              meta={[company, period].filter(Boolean).join(" · ")}
              score={getScore("project", project.id)}
            >
              <KeywordChips matched={keywords.matched} missing={keywords.missing} limit={5} size="xs" className="mt-1.5" />
              <AnimatePresence initial={false}>
                {isPicked && project.bullets.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                    // the bullets are their own choices: a click on them must not toggle the project
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <div className="mt-2.5 space-y-1 border-t pt-2.5">
                      <p className={cn("text-[11px]", bullets.length === 0 ? "font-medium text-amber-700" : "text-muted-foreground")}>
                        {bullets.length === 0 ? "Pick at least one bullet to show this project" : `${bullets.length} of ${project.bullets.length} bullets shown`}
                      </p>
                      {project.bullets.map((bullet) => {
                        const isBulletPicked = bullets.includes(bullet.id);
                        return (
                          <div
                            key={bullet.id}
                            role="checkbox"
                            aria-checked={isBulletPicked}
                            tabIndex={0}
                            onClick={() => toggleBullet(project.id, bullet.id)}
                            onKeyDown={(event) => {
                              if (event.key === " " || event.key === "Enter") {
                                event.preventDefault();
                                toggleBullet(project.id, bullet.id);
                              }
                            }}
                            className="group flex cursor-pointer gap-2 rounded-lg p-1.5 outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            <div className="pt-px"><PickBox selected={isBulletPicked} round /></div>
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-xs leading-snug", isBulletPicked ? "text-foreground" : "text-muted-foreground")}>
                                {getCustomField("bullet", bullet.id, "text", bullet.text)}
                              </p>
                              <KeywordChips matched={getKeywords("bullet", bullet.id).matched} size="xs" limit={4} />
                            </div>
                            <ScoreBadge score={getScore("bullet", bullet.id)} />
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </PickRow>
          );
        })}
      </div>
    </div>
  );
}
