import { useProfileStore } from "@/store/profile";
import { useCVSelection } from "../provider/hook";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Calendar, Building2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ExperiencePicker() {
  const { experience } = useProfileStore();
  const { toggleExperience, selection, getScore, getCustomField } = useCVSelection();

  return (
    <div className="space-y-3 p-1">
      <AnimatePresence>
        {experience.map((exp, index) => {
          const isSelected = selection.selectedExpIds.includes(exp.id);

          const score = getScore('experience', exp.id);
          const formattedScore = score !== undefined ? Math.round(score * 100) : null;

          const jobTitle = getCustomField('experience', exp.id, 'jobTitle', exp.jobTitle);
          
          return (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleExperience(exp.id)}
              className={cn(
                "group relative flex flex-col gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer select-none",
                isSelected 
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10" 
                  : "border-muted bg-card hover:border-muted-foreground/50"
              )}
            >
              {/* Indicateur de sélection visuel (Coche) */}
              <div className={cn(
                "absolute top-3 right-3 rounded-full border flex items-center justify-center transition-colors",
                isSelected ? "bg-primary border-primary" : "bg-background border-muted-foreground/30"
              )}>
                {formattedScore !== null && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-[10px] h-5 px-1.5 font-semibold gap-1 transition-colors",
                      formattedScore >= 80 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                        : formattedScore >= 50 
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Sparkles size={10} />
                    {formattedScore}%
                  </Badge>
                )}
                <div className={cn(
                  "h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary border-primary" : "bg-background border-muted-foreground/30"
                )}>
                  {isSelected && <Check className="text-primary-foreground" size={12} strokeWidth={3} />}
                </div>
              </div>

              {/* Contenu de l'expérience */}
              <div className="pr-6">
                <h4 className={cn(
                  "font-semibold leading-none tracking-tight transition-colors",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {jobTitle}
                </h4>
                
                <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                  <Building2 size={14} />
                  <span className="font-medium">{exp.company}</span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    <Calendar size={12} />
                    <span>
                      {new Date(exp.startDate).getFullYear()} - {exp.endDate === 'Present' ? 'Présent' : exp.endDate ? new Date(exp.endDate).getFullYear() : '?'}
                    </span>
                  </div>
                  
                  {/* Badge de statut optionnel */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Badge variant="outline" className="bg-primary/10 text-[10px] h-5 border-primary/20 text-primary">
                        Included
                      </Badge>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Overlay subtil au hover pour renforcer le feedback */}
              {!isSelected && (
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/2 rounded-xl transition-colors" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}