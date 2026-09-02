import type { Education } from "@shared/Education.interface";
import { useCVSelection } from "../../provider/hook";
import { i18n } from "../i18n";
import { TemplateInput } from "../templateFields/TemplateInput";
import { TemplateTextArea } from "../templateFields/TemplateTextArea";

export default function CVEducation({ educations, lang = 'en' }: { educations: Education[]; lang?: string }) {
  const { selection } = useCVSelection();
  const t = i18n[lang as keyof typeof i18n];

  const sortedEducation = [...educations]
    .filter(edu => selection.selectedEducationIds.includes(edu.id))
    .sort((a, b) => {
      if (a.endDate === 'Present') return -1;
      if (b.endDate === 'Present') return 1;
      return new Date(b.endDate || '').getTime() - new Date(a.endDate || '').getTime();
    });

  if (sortedEducation.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-b-2 border-slate-900 pb-1">
        <TemplateInput
          entityType="education"
          id="section"
          field="title"
          defaultValue={t.educationTitle || "Éducation"}
        />
      </h2>

      <div className="flex flex-col gap-4">
        {sortedEducation.map((edu) => (
          <article key={edu.id} className="flex flex-col">
            {/* Header: Diplôme et Dates */}
            <div className="flex justify-between items-baseline">
              <h3 className="text-[12px] font-bold text-slate-900 uppercase">
                <TemplateInput
                  entityType="education"
                  id={edu.id}
                  field="degree"
                  defaultValue={edu.degree}
                />
              </h3>
              <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap ml-4">
                {new Date(edu.startDate).getFullYear()} — {
                  edu.endDate === 'Present' 
                    ? 'Présent' 
                    : edu.endDate 
                      ? new Date(edu.endDate).getFullYear() 
                      : ''
                }
              </span>
            </div>

            {/* Institution et Lieu */}
            <div className="flex justify-between items-baseline text-[11px]">
              <span className="text-slate-700 font-medium italic">
                <TemplateInput
                  entityType="education"
                  id={edu.id}
                  field="institution"
                  defaultValue={edu.institution}
                />
              </span>
              <span className="text-slate-500 italic">
                <TemplateInput
                  entityType="education"
                  id={edu.id}
                  field="location"
                  defaultValue={edu.location || ''}
                />
              </span>
            </div>

            {/* Description optionnelle (ex: Spécialisation, Distinctions) */}
            {edu.description && (
              <TemplateTextArea
                entityType="education"
                id={edu.id}
                field="description"
                defaultValue={edu.description || ''}
                className="mt-1 text-[11px] text-slate-600 leading-snug"
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}