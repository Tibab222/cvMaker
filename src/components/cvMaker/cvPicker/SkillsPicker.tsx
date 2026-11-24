import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/profile";
import { Tabs } from "@/store/ui";
import type { Skills } from "@shared/Skills.interface";
import { useCVSelection } from "../provider/hook";
import { EmptyProfile, SelectionBar } from "./PickerParts";

/** Skills grouped by their category (the templates group them the same way), in first-seen order. */
const groupByCategory = (skills: Skills[]) => {
  const groups = new Map<string, Skills[]>();
  for (const skill of skills) {
    const key = skill.category?.trim() || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(skill);
  }
  return [...groups.entries()];
};

export default function SkillsPicker() {
  const { skills } = useProfileStore();
  const { toggleSkill, selection } = useCVSelection();
  const [search, setSearch] = useState("");
  const picked = selection.selectedSkillsIds;

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const shown = needle
      ? skills.filter((skill) => skill.name.toLowerCase().includes(needle) || skill.category?.toLowerCase().includes(needle))
      : skills;
    return groupByCategory(shown);
  }, [skills, search]);

  if (skills.length === 0) return <EmptyProfile what="skills" tab={Tabs.SKILLS} />;

  const setAll = (list: Skills[], on: boolean) =>
    list.filter((skill) => picked.includes(skill.id) !== on).forEach((skill) => toggleSkill(skill.id));
  const hasCategories = groups.some(([category]) => category);

  return (
    <div className="space-y-3">
      <SelectionBar
        selected={skills.filter((skill) => picked.includes(skill.id)).length}
        total={skills.length}
        onAll={() => setAll(skills, true)}
        onNone={() => setAll(skills, false)}
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search a skill" value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 pl-8 text-sm" />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted" aria-label="Clear the search">
            <X className="size-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {groups.map(([category, list]) => {
        const count = list.filter((skill) => picked.includes(skill.id)).length;
        return (
          <section key={category || "_"} className="space-y-1.5">
            {(hasCategories || category) && (
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {category || "No category"} <span className="font-normal normal-case tabular-nums">· {count}/{list.length}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setAll(list, count < list.length)}
                  className="text-[11px] font-medium text-brand hover:underline"
                >
                  {count < list.length ? "Add all" : "Remove all"}
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {list.map((skill) => {
                const isPicked = picked.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    aria-pressed={isPicked}
                    onClick={() => toggleSkill(skill.id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      isPicked
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-brand/40 hover:text-foreground",
                    )}
                  >
                    {isPicked && <Check className="size-3" strokeWidth={3} />}
                    {skill.name}
                    {skill.proficiency && <span className="opacity-70">· {skill.proficiency}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No skill matches “{search}”.</p>}
    </div>
  );
}
