import { useProfileStore } from "@/store/profile";
import { Tabs } from "@/store/ui";
import type { CvmCollection, CvmCollectionSource } from "@shared/cvm/format";
import { useCVSelection } from "../provider/hook";
import { EmptyProfile, PickRow, SelectionBar } from "./PickerParts";

interface Item {
  id: string;
  title: string;
  subtitle?: string;
}

/** What the picker shows for each kind of profile item. */
const useItems = (source: CvmCollectionSource): Item[] => {
  const { projects, experience, education, skills } = useProfileStore();
  switch (source) {
    case "projects":
      return projects.map((p) => ({ id: p.id, title: p.title, subtitle: p.subtitle }));
    case "experiences":
      return experience.map((e) => ({ id: e.id, title: e.jobTitle, subtitle: e.company }));
    case "education":
      return education.map((e) => ({ id: e.id, title: e.degree, subtitle: e.institution }));
    case "skills":
      return skills.map((s) => ({ id: s.id, title: s.name, subtitle: s.category }));
  }
};

const PROFILE_TAB: Record<CvmCollectionSource, { tab: Tabs; what: string }> = {
  projects: { tab: Tabs.PROJECTS, what: "projects" },
  experiences: { tab: Tabs.EXPERIENCE, what: "experience" },
  education: { tab: Tabs.EDUCATION, what: "education" },
  skills: { tab: Tabs.SKILLS, what: "skills" },
};

/**
 * Picks the items of a list declared by the template (meta "collections"), e.g. the projects of an appendix.
 * Items are shown in the order they are picked.
 */
export default function CollectionPicker({ name, collection }: { name: string; collection: CvmCollection }) {
  const { selection, toggleCollectionItem } = useCVSelection();
  const items = useItems(collection.source);
  const picked = selection.collections?.[name] ?? [];

  if (items.length === 0) return <EmptyProfile {...PROFILE_TAB[collection.source]} />;

  return (
    <div className="space-y-3">
      <SelectionBar
        selected={items.filter((item) => picked.includes(item.id)).length}
        total={items.length}
        onAll={() => items.filter((item) => !picked.includes(item.id)).forEach((item) => toggleCollectionItem(name, item.id))}
        onNone={() => picked.forEach((id) => toggleCollectionItem(name, id))}
      />
      <p className="text-[11px] text-muted-foreground">
        A part of this template only. They appear in the order you pick them.
        {collection.source === "projects" && collection.bullets !== "selected" && " Every bullet of a project is shown there."}
      </p>
      <div className="space-y-2">
        {items.map((item) => {
          const order = picked.indexOf(item.id);
          return (
            <PickRow
              key={item.id}
              selected={order !== -1}
              order={order !== -1 ? order : undefined}
              onToggle={() => toggleCollectionItem(name, item.id)}
              title={item.title || "Untitled"}
              subtitle={item.subtitle}
            />
          );
        })}
      </div>
    </div>
  );
}
