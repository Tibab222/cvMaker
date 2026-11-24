import { useProfileStore } from "@/store/profile";
import { Tabs } from "@/store/ui";
import { useCVSelection } from "../provider/hook";
import { EmptyProfile, PickRow, SelectionBar } from "./PickerParts";
import { yearRange } from "./yearRange";

const KIND_LABELS: Record<string, string> = { degree: "Degree", certification: "Certification", course: "Course" };

export default function EducationPicker() {
  const { education, profile } = useProfileStore();
  const { toggleEducation, selection } = useCVSelection();
  const picked = selection.selectedEducationIds;

  if (education.length === 0) return <EmptyProfile what="education" tab={Tabs.EDUCATION} />;

  return (
    <div className="space-y-3">
      <SelectionBar
        selected={education.filter((edu) => picked.includes(edu.id)).length}
        total={education.length}
        onAll={() => education.filter((edu) => !picked.includes(edu.id)).forEach((edu) => toggleEducation(edu.id))}
        onNone={() => education.filter((edu) => picked.includes(edu.id)).forEach((edu) => toggleEducation(edu.id))}
      />
      <p className="text-[11px] text-muted-foreground">Shown from the most recent.</p>
      <div className="space-y-2">
        {education.map((edu) => (
          <PickRow
            key={edu.id}
            selected={picked.includes(edu.id)}
            onToggle={() => toggleEducation(edu.id)}
            title={edu.degree || "Untitled"}
            subtitle={[edu.institution, edu.location].filter(Boolean).join(" · ")}
            meta={[edu.kind && KIND_LABELS[edu.kind], yearRange(edu.startDate, edu.endDate, profile?.language === "fr" ? "Présent" : "Present")].filter(Boolean).join(" · ")}
          />
        ))}
      </div>
    </div>
  );
}
