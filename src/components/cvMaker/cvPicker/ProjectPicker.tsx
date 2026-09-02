import { useProfileStore } from "@/store/profile";
import { useCVSelection } from "../provider/hook";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, FolderKanban, Circle, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectPicker() {
  const { projects } = useProfileStore();
  const { toggleProject, selection, toggleBullet, getScore, getCustomField } = useCVSelection();

  const selectBullet = (event: React.MouseEvent<HTMLDivElement>, projectId: string, bulletId: string) => {
    event.stopPropagation();
    toggleBullet(projectId, bulletId);
  }

  return (
    <div className="space-y-4 p-1">
      <AnimatePresence>
        {projects.map((project, index) => {
          const isSelected = selection.selectedProjectIds.includes(project.id);

          const projectScore = getScore('project', project.id);
          const formattedProjectScore = projectScore !== undefined ? Math.round(projectScore * 100) : null;

          const projectTitle = getCustomField('project', project.id, 'title', project.title);
          const projectSubtitle = getCustomField('project', project.id, 'subtitle', project.subtitle);
          
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col gap-1"
            >
              {/* Carte Principale du Projet */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleProject(project.id)}
                className={cn(
                  "group relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer select-none",
                  isSelected 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-muted bg-card hover:border-muted-foreground/30"
                )}
              >
                <div className={cn(
                  "mt-1 p-2 rounded-lg transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <FolderKanban size={18} />
                </div>

                <div className="flex-1 pr-6">
                  <h4 className={cn(
                    "font-bold leading-none tracking-tight mb-1",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {projectTitle}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 italic">
                    {projectSubtitle}
                  </p>
                </div>

                <div className="absolute top-2 right-4 flex items-center gap-2">
                  {formattedProjectScore !== null && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[10px] h-5 px-1.5 font-semibold gap-1 transition-colors",
                        formattedProjectScore >= 80 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                          : formattedProjectScore >= 50 
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Sparkles size={10} />
                      {formattedProjectScore}%
                    </Badge>
                  )}

                  {/* Checkbox stylisée */}
                  <div className={cn(
                    "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                    isSelected ? "bg-primary border-primary rotate-0" : "bg-background border-muted-foreground/30 rotate-90"
                  )}>
                    {isSelected && <Check className="text-primary-foreground" size={12} strokeWidth={4} />}
                  </div>
                </div>
              </motion.div>

              {/* Liste des Bullets (Points d'impact) */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden ml-6 border-l-2 border-muted pl-4 flex flex-col gap-2 mt-1"
                  >
                    {project.bullets.map((bullet) => {
                      const isBulletSelected = selection.selectedBullets[project.id]?.includes(bullet.id) || false;
                      const bulletScore = getScore('bullet', bullet.id);
                      const formattedBulletScore = bulletScore !== undefined ? Math.round(bulletScore * 100) : null;

                      const bulletText = getCustomField('bullet', bullet.id, 'text', bullet.text);

                      return (
                        <motion.div
                          key={bullet.id}
                          whileHover={{ x: 4 }}
                          onClick={(event) => selectBullet(event, project.id, bullet.id)}
                          className={cn(
                            "group/bullet flex items-center justify-between gap-3 p-2.5 rounded-lg transition-all cursor-pointer border border-transparent",
                            isBulletSelected 
                              ? "bg-primary/10 border-primary/20" 
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="mt-0.5 shrink-0">
                              {isBulletSelected 
                                ? <CheckCircle2 size={14} className="text-primary" /> 
                                : <Circle size={14} className="text-muted-foreground/50" />
                              }
                            </div>
                            <span className={cn(
                              "text-[13px] leading-snug",
                              isBulletSelected ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>
                              {bulletText}
                            </span>
                          </div>

                          {formattedBulletScore !== null && (
                            <span className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 transition-colors",
                              formattedBulletScore >= 80 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                : formattedBulletScore >= 50 
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                                : "bg-muted text-muted-foreground border-transparent"
                            )}>
                              {formattedBulletScore}%
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}