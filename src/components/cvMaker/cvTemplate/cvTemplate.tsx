import { useTemplateStore } from "@/store/templates";
import { useCVSelection } from "../provider/hook";
import CvmDocument from "./CvmDocument";
import { useResumeContext } from "./useResumeContext";

/** The resume being edited, rendered with its .cvm template. */
export default function CVTemplate() {
  const { templateId } = useCVSelection();
  // the list is read too, so an imported template shows up without a reload
  const templates = useTemplateStore((state) => state.templates);
  const getTemplate = useTemplateStore((state) => state.get);
  const entry = templates.length ? getTemplate(templateId) : undefined;
  const { context, lang } = useResumeContext(entry?.template);

  if (!context || !entry) return <div>No profile data available</div>;

  return <CvmDocument template={entry.template} context={context} lang={lang} domId="cv-content" />;
}
