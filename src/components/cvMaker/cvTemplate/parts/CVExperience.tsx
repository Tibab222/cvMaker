import type { Experience } from "@shared/Experience.interface";
import { i18n } from "../i18n";
import { TemplateInput } from "../templateFields/TemplateInput";
import { TemplateTextArea } from "../templateFields/TemplateTextArea";

export default function CVExperience({ experiences, lang = 'en' }: { experiences: Experience[]; lang?: string }) {
  const t = i18n[lang as keyof typeof i18n];

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "";
    if (date === "Present") return "Présent";
    
    const d = typeof date === "string" ? new Date(date) : date;
    
    return d.toLocaleDateString("fr-FR", {
      month: "short",
      year: "numeric",
    }).replace('.', '');
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-slate-900 pb-1">
        <TemplateInput
          entityType="experience"
          id="section"
          field="title"
          defaultValue={t.experienceTitle || "Expériences Professionnelles"}
        />
      </h2>

      <div className="flex flex-col gap-6">
        {experiences.map((exp) => (
          <article key={exp.id} className="flex flex-col avoid-break">
            <div className="flex justify-between items-baseline leading-none">
              <h3 className="text-[13px] font-bold text-slate-900 uppercase">
                <TemplateInput
                  entityType="experience"
                  id={exp.id}
                  field="jobTitle"
                  defaultValue={exp.jobTitle}
                />
                <span className="text-slate-400 font-normal">@</span>
                <TemplateInput
                  entityType="experience"
                  id={exp.id}
                  field="company"
                  defaultValue={exp.company}
                  className="text-slate-400 font-normal"
                />
              </h3>
              <span className="text-[10px] font-bold text-slate-500 tabular-nums uppercase">
                {formatDate(exp.startDate)} — {formatDate(exp.endDate)}
              </span>
            </div>

            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              {exp.location}
            </span>

            {exp.description && (
              <TemplateTextArea
                entityType="experience"
                id={exp.id}
                field="description"
                defaultValue={exp.description || ''}
                className="mt-2 text-[11px] text-slate-700 leading-relaxed"
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}