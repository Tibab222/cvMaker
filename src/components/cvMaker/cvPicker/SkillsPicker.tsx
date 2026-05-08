import { useState, useMemo } from "react";
import { useProfileStore } from "@/store/profile";
import { useCVSelection } from "../provider/hook";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Search, X, Code2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SkillsPicker() {
  const { skills } = useProfileStore();
  const { toggleSkill, selection } = useCVSelection();
  const [search, setSearch] = useState("");

  // Filtrage intelligent
  const filteredSkills = useMemo(() => {
    return skills.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [skills, search]);

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* Barre de recherche stylisée */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search a skill..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
        />
        {search && (
          <button 
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Liste des compétences en mode "Tags" */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {filteredSkills.map((skill) => {
            const isSelected = selection.selectedSkillsIds.includes(skill.id);
            
            return (
              <motion.button
                key={skill.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSkill(skill.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-background border-muted text-muted-foreground hover:border-muted-foreground/50"
                )}
              >
                {/* Icône contextuelle si c'est une compétence technique ou une langue (proficiency) */}
                {skill.proficiency ? (
                  <Star className={cn("h-3 w-3", isSelected ? "text-primary-foreground" : "text-amber-500")} />
                ) : (
                  <Code2 className="h-3 w-3" />
                )}
                
                {skill.name}
                
                {skill.proficiency && (
                  <span className={cn(
                    "ml-1 text-[10px] opacity-70 border-l pl-1.5",
                    isSelected ? "border-primary-foreground/30" : "border-muted-foreground/30"
                  )}>
                    {skill.proficiency}
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* État vide */}
      {filteredSkills.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground italic">
          No skill found...
        </div>
      )}
    </div>
  );
}