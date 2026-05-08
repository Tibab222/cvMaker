// components/cv/CVTemplate.tsx
import { useProfileStore } from "@/store/profile";
import { useCVSelection } from "../provider/hook";
import CVHeader from "./parts/CVHeader";
import CVExperience from "./parts/CVExperience";
import CVProject from "./parts/CVProject";
import CVSkills from "./parts/CVSkills";
import { CopyrightIcon } from "lucide-react";
import CVEducation from "./parts/CVEducation";
// import CVSection from "./parts/CVSection";

export default function CVTemplate() {
  const { profile, experience, projects, skills, education } = useProfileStore();
  const { selection } = useCVSelection();

  // Filtrage des données selon la sélection du Picker
  const selectedExps = experience.filter(exp => selection.selectedExpIds.includes(exp.id));

  if (!profile) return <div>No profile data available</div>;

  return (
    // Le id="cv-content" est crucial pour l'export PDF plus tard
    <div 
      id="cv-content" 
      className="w-[210mm] min-h-[297mm] bg-white p-[15mm] text-slate-900 shadow-sm flex flex-col gap-6 font-sans antialiased"
      style={{ boxSizing: 'border-box' }}
    >
      <CVHeader profile={profile} />
      <CVEducation educations={education} />
      {selectedExps.length > 0 && <CVExperience experiences={selectedExps} />}
      <CVProject projects={projects} />
      <CVSkills skills={skills} />

      <div className="mt-auto flex justify-end items-center pt-4 opacity-30 hover:opacity-100 transition-opacity">
        <a 
          href="https://thibautdlh.me"
          className="text-[8px] font-mono tracking-tighter text-slate-400 hover:text-primary flex items-center gap-1"
        >
          <span>CV généré par un outil de création conçu et développé par Thibaut Delahaie</span>
          <span className="h-2 w-2"><CopyrightIcon size={10} /></span>
        </a>
      </div>
    </div>
  );
}