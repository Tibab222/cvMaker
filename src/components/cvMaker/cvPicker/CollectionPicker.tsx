import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/profile";
import type { CvmCollection, CvmCollectionSource } from "@shared/cvm/format";
import { useCVSelection } from "../provider/hook";

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

/**
 * Picks the items of a list declared by the template (meta "collections"), e.g. the projects of an appendix.
 * Items are shown in the order they are picked.
 */
export default function CollectionPicker({ name, collection }: { name: string; collection: CvmCollection }) {
  const { selection, toggleCollectionItem } = useCVSelection();
  const items = useItems(collection.source);
  const picked = selection.collections?.[name] ?? [];

  return (
    <div className="space-y-2 p-1">
      <p className="text-xs text-muted-foreground">
        This template has a "{collection.label}" part. Pick what goes in it; they appear in the order you pick them.
        {collection.source === "projects" && collection.bullets !== "selected" && " Every bullet of a project is shown there."}
      </p>
      {items.map((item) => {
        const position = picked.indexOf(item.id);
        const isPicked = position !== -1;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggleCollectionItem(name, item.id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors",
              isPicked ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30",
            )}
          >
            {isPicked ? <CheckCircle2 className="size-4 text-primary shrink-0" /> : <Circle className="size-4 text-muted-foreground shrink-0" />}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold truncate">{item.title || "Untitled"}</span>
              {item.subtitle && <span className="block text-xs text-muted-foreground truncate">{item.subtitle}</span>}
            </span>
            {isPicked && <span className="text-xs font-semibold text-primary">#{position + 1}</span>}
          </button>
        );
      })}
    </div>
  );
}
