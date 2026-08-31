import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, ExternalLink, Pencil, Trash2, X, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BulletListEditor } from "./BulletList";
import type { Project } from "@shared/projects.interface";
import { cn } from "@/lib/utils";

interface Props {
  project: Project;
  onSave: (updatedProject: Project) => void;
  onDelete?: (id: string) => void;
  onCancelNew?: () => void;
  defaultEdit?: boolean;
  defaultExpanded?: boolean;
}

const panel = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

export default function ProjectCard({
  project,
  onSave,
  onDelete,
  onCancelNew,
  defaultEdit = false,
  defaultExpanded = false,
}: Props) {
  const [formData, setFormData] = useState<Project>(project);
  const [isEditing, setIsEditing] = useState(defaultEdit);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    const setData = () => setFormData(project);
    setData();
  }, [project]);

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (!project.id) {
      onCancelNew?.();
      return;
    }
    setFormData(project);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsExpanded(true);
    setIsEditing(true);
  };

  return (
    <motion.div layout transition={{ type: "spring", stiffness: 320, damping: 34 }}>
      <Card className="overflow-hidden border-border/70 transition-shadow duration-300 hover:shadow-md">
        <AnimatePresence mode="wait" initial={false}>
          {isEditing ? (
            <motion.div key="edit" {...panel}>
              <CardHeader className="pb-3">
                <Input
                  autoFocus
                  placeholder="Project title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-11 text-base font-semibold"
                />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="relative">
                  <Building2
                    size={15}
                    className="pointer-events-none absolute left-3 top-3 text-muted-foreground"
                  />
                  <Textarea
                    placeholder="Subtitle / company"
                    value={formData.subtitle ?? ""}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="min-h-16 resize-none pl-9"
                  />
                </div>
                <div className="relative">
                  <ExternalLink
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="https://…"
                    value={formData.link ?? ""}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="pl-9"
                  />
                </div>

                <BulletListEditor
                  bullets={formData.bullets || []}
                  onChange={(bullets) => setFormData({ ...formData, bullets })}
                />
              </CardContent>
              <CardFooter className="mt-4 flex gap-2 border-t bg-muted/30 py-3">
                {project.id && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(project.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={15} className="mr-1.5" /> Delete
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={handleCancel}>
                  <X size={15} className="mr-1.5" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Check size={15} className="mr-1.5" /> Save
                </Button>
              </CardFooter>
            </motion.div>
          ) : (
            <motion.div key="view" {...panel}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isExpanded ? "Collapse details" : "Expand details"}
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded((v: boolean) => !v)}
                    className="mt-0.5 h-8 w-8 shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <ChevronDown size={18} />
                    </motion.div>
                  </Button>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold tracking-tight">
                      {project.title || "Untitled project"}
                    </h3>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit project"
                      onClick={startEditing}
                      className="rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="details"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={{
                      initial: { height: 0, opacity: 0 },
                      animate: { height: "auto", opacity: 1 },
                      exit: { height: 0, opacity: 0 },
                    }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0">
                      {project.subtitle && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {project.subtitle}
                        </p>
                      )}
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 transition-colors hover:underline"
                        >
                          <ExternalLink size={14} />
                          <span className="max-w-60 truncate">{project.link}</span>
                        </a>
                      )}

                      <div className={cn("mt-4", !project.subtitle && !project.link && "mt-0")}>
                        {project.bullets?.length ? (
                          <ul className="flex flex-col gap-3">
                            {project.bullets.map((bullet) => (
                              <li key={bullet.id} className="relative pl-4">
                                <span className="absolute left-0 top-[0.55rem] size-1.5 rounded-full bg-primary/60" />
                                <p className="text-sm leading-relaxed">{bullet.text}</p>
                                {bullet.tags?.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {bullet.tags.map((tag, i) => (
                                      <Badge
                                        key={`${tag}-${i}`}
                                        variant="secondary"
                                        className="rounded-full text-[11px] font-normal"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm italic text-muted-foreground">No impact points yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
