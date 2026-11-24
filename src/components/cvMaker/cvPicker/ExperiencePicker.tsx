import { useProfileStore } from "@/store/profile";
import { Tabs } from "@/store/ui";
import { useCVSelection } from "../provider/hook";
import KeywordChips from "./KeywordChips";
import { EmptyProfile, PickRow, SelectionBar } from "./PickerParts";
import { yearRange } from "./yearRange";

export default function ExperiencePicker() {
  const { experience, profile } = useProfileStore();
  const { toggleExperience, selection, getScore, getKeywords, getCustomField } = useCVSelection();
  const picked = selection.selectedExpIds;

  if (experience.length === 0) return <EmptyProfile what="experience" tab={Tabs.EXPERIENCE} />;

  return (
    <div className="space-y-3">
      <SelectionBar
        selected={picked.filter((id) => experience.some((exp) => exp.id === id)).length}
        total={experience.length}
        onAll={() => experience.filter((exp) => !picked.includes(exp.id)).forEach((exp) => toggleExperience(exp.id))}
        onNone={() => picked.forEach((id) => toggleExperience(id))}
      />
      <p className="text-[11px] text-muted-foreground">They appear on the resume in the order you pick them.</p>
      <div className="space-y-2">
        {experience.map((exp) => {
          const order = picked.indexOf(exp.id);
          const keywords = getKeywords("experience", exp.id);
          return (
            <PickRow
              key={exp.id}
              selected={order !== -1}
              order={order !== -1 ? order : undefined}
              onToggle={() => toggleExperience(exp.id)}
              title={getCustomField("experience", exp.id, "jobTitle", exp.jobTitle) || "Untitled position"}
              subtitle={[exp.company, exp.location].filter(Boolean).join(" · ")}
              meta={yearRange(exp.startDate, exp.endDate, profile?.language === "fr" ? "Présent" : "Present")}
              score={getScore("experience", exp.id)}
            >
              <KeywordChips matched={keywords.matched} missing={keywords.missing} limit={5} size="xs" className="mt-1.5" />
            </PickRow>
          );
        })}
      </div>
    </div>
  );
}
