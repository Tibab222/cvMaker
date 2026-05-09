import type { Project } from "@shared/projects.interface";
import { useCVSelection } from "../../provider/hook";
import { LinkIcon } from "lucide-react";

export default function CVProject({ projects }: { projects: Project[] }) {
  const { selection } = useCVSelection();

  // On ne garde que les projets qui ont au moins un bullet sélectionné
  const activeProjects = projects.filter(project => 
    selection.selectedProjectIds.includes(project.id)
  );

  if (activeProjects.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-slate-900 pb-0">
        Projets & Réalisations
      </h2>

      <div className="flex flex-col gap-3">
        {activeProjects.map((project) => {
          // Filtrage des bullets pour ne garder que ceux cochés dans le side-menu
          const selectedBullets = project.bullets.filter(b => 
            selection.selectedBullets[project.id]?.includes(b.id)
          );

          if (selectedBullets.length === 0) return null;

          return (
            <article key={project.id} className="flex flex-col gap-1">
              {/* Header du Projet */}
              <div className="flex justify-between items-baseline leading-none">
                <h3 className="text-[13px] font-bold text-slate-900 uppercase">
                  {project.title}
                  {project.subtitle && (
                    <span className="text-slate-400 font-normal normal-case ml-2 italic">
                      — {project.subtitle}
                    </span>
                  )}
                </h3>
                {project.link && (<>
                  <LinkIcon size={12} className="inline text-slate-400 pr-1" />
                  <a 
                    href={project.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] font-mono text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {project.link.replace(/^https?:\/\//, '')}
                  </a>
                </>)}
              </div>

              {/* Liste des points d'impact */}
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {selectedBullets.map((bullet) => (
                  <li key={bullet.id} className="group flex flex-col gap-1">
                    <div className="relative pl-4 text-[11px] text-slate-700 leading-snug text-justify">
                      {/* Puce custom */}
                      <span className="absolute left-0 top-[6px] h-1 w-1 bg-slate-400 rounded-full" />
                      
                      {bullet.text}

                      {/* Affichage des tags (technos) en ligne, très discret */}
                      {bullet.tags && bullet.tags.length > 0 && (
                        <div className="inline-flex flex-wrap gap-1 ml-2">
                          {bullet.tags.map((tag, i) => (
                            <span 
                              key={i} 
                              className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 rounded-sm uppercase tracking-tight"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}