import { useMemo } from "react";
import type { CvmTemplate } from "@shared/cvm/format";
import { useProfileStore } from "@/store/profile";
import { buildTemplateContext } from "@/cvm/context";
import { useCVSelection } from "../provider/hook";

/** Template data of the resume being edited, for a given template (null until a profile is loaded). */
export function useResumeContext(template: CvmTemplate | undefined) {
  const { profile, experience, projects, skills, education } = useProfileStore();
  const { selection, includePhoto, showSummary, summaryBullets, customTexts } = useCVSelection();
  const lang = profile?.language || "en";

  const context = useMemo(() => {
    if (!profile || !template) return null;
    return buildTemplateContext({
      meta: template.meta,
      lang,
      profile,
      experience,
      projects,
      skills,
      education,
      selection,
      customTexts,
      summaryBullets,
      includePhoto,
      showSummary,
    });
  }, [template, lang, profile, experience, projects, skills, education, selection, customTexts, summaryBullets, includePhoto, showSummary]);

  return { context, lang };
}
