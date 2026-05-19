import { useProfileStore } from "@/store/profile";
import { useCVSelection } from "../provider/hook";
import CVHeader from "./parts/CVHeader";
import CVExperience from "./parts/CVExperience";
import CVProject from "./parts/CVProject";
import CVSkills from "./parts/CVSkills";
import CVEducation from "./parts/CVEducation";

export default function CVTemplate() {
  const { profile, experience, projects, skills, education } = useProfileStore();
  const { selection } = useCVSelection();

  // keep the order of selected experiences
  const selectedExps = experience.filter(exp => selection.selectedExpIds.includes(exp.id)).sort((a, b) => {
    return selection.selectedExpIds.indexOf(a.id) - selection.selectedExpIds.indexOf(b.id);
  });
  const lang = profile?.language || 'en';
  // const t = i18n[lang as keyof typeof i18n];

  if (!profile) return <div>No profile data available</div>;

  return (
    <div 
      id="cv-content" 
      className="w-[210mm] min-h-[297mm] bg-white p-[15mm] relative text-slate-900 shadow-sm flex flex-col gap-3 font-sans antialiased"
      style={{ boxSizing: 'border-box' }}
    >
      <CVHeader profile={profile} />
      <CVEducation educations={education} lang={lang} />
      {selectedExps.length > 0 && <CVExperience experiences={selectedExps} lang={lang} />}
      <CVProject projects={projects} lang={lang} />
      <CVSkills skills={skills} lang={lang} />
      <div className="absolute top-[297mm] left-0 w-full hidden-print border-t border-red-600">
        {/* ligne de fin de page si il y en a besoin */}
        <span className="italic text-[8px] text-shadow-xs text-red-600/50 text-left">End of page</span>
      </div>
    </div>
  );
}