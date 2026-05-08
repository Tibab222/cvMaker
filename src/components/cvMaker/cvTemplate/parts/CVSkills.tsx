import type { Skills } from "@shared/Skills.interface";
import { useCVSelection } from "../../provider/hook";

export default function CVSkills({ skills }: { skills: Skills[] }) {
  const { selection } = useCVSelection();

  // On ne garde que les compétences sélectionnées dans la sidebar
  const selectedSkills = skills.filter((s) =>
    selection.selectedSkillsIds.includes(s.id)
  );

  if (selectedSkills.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-slate-900 pb-1">
        Compétences & Langues
      </h2>

      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 py-1">
        {selectedSkills.map((skill, index) => (
          <div key={skill.id} className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">
              {skill.name}
            </span>
            
            {skill.proficiency && (
              <span className="text-[10px] text-slate-500 font-medium italic">
                ({skill.proficiency})
              </span>
            )}

            {/* Séparateur visuel (ne s'affiche pas pour le dernier élément) */}
            {index < selectedSkills.length - 1 && (
              <span className="text-slate-300 font-light ml-2">|</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}