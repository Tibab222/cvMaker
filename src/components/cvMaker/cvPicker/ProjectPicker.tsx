import { useProfileStore } from "@/store/profile";
import { useCVSelection } from "../provider/hook";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, FolderKanban, Circle, CheckCircle2 } from "lucide-react";

export default function ProjectPicker() {
  const { projects } = useProfileStore();
  const { toggleProject, selection, toggleBullet } = useCVSelection();

  const selectBullet = (event: React.MouseEvent<HTMLDivElement>, projectId: string, bulletId: string) => {
    event.stopPropagation();
    toggleBullet(projectId, bulletId);
  }

  return (
    <div className="space-y-4 p-1">
      <AnimatePresence>
        {projects.map((project, index) => {
          const isSelected = selection.selectedProjectIds.includes(project.id);
          
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
                    {project.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 italic">
                    {project.subtitle}
                  </p>
                </div>

                {/* Checkbox stylisée */}
                <div className={cn(
                  "absolute top-4 right-4 h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                  isSelected ? "bg-primary border-primary rotate-0" : "bg-background border-muted-foreground/30 rotate-90"
                )}>
                  {isSelected && <Check className="text-primary-foreground" size={12} strokeWidth={4} />}
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
                      return (
                        <motion.div
                          key={bullet.id}
                          whileHover={{ x: 4 }}
                          onClick={(event) => selectBullet(event, project.id, bullet.id)}
                          className={cn(
                            "flex items-start gap-3 p-2.5 rounded-lg transition-all cursor-pointer border border-transparent",
                            isBulletSelected 
                              ? "bg-primary/10 border-primary/20 text-primary-foreground" 
                              : "hover:bg-muted/50 text-muted-foreground"
                          )}
                        >
                          <div className="mt-0.5">
                            {isBulletSelected 
                              ? <CheckCircle2 size={14} className="text-primary" /> 
                              : <Circle size={14} className="text-muted-foreground/50" />
                            }
                          </div>
                          <span className={cn(
                            "text-[13px] leading-snug",
                            isBulletSelected ? "text-foreground font-medium" : "text-muted-foreground"
                          )}>
                            {bullet.text}
                          </span>
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