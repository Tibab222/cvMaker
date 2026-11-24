import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LocationInput from "@/components/ui/LocationInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EXTRA_FIELDS, extraFieldText, parseTags, type ExtraFieldDef, type ExtraFieldSection } from "@shared/profileFields";

const NONE = "__none__";

/** Tags are typed as text: the list is only parsed when the field is left, so "a, " can be typed freely. */
function TagsInput({ def, value, onChange }: { def: ExtraFieldDef; value: unknown; onChange: (tags: string[] | undefined) => void }) {
  // text being typed; null when the field shows the stored list
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      value={draft ?? extraFieldText(value)}
      placeholder={def.placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === null) return;
        const tags = parseTags(draft);
        onChange(tags.length ? tags : undefined);
        setDraft(null);
      }}
    />
  );
}

function ExtraField({ def, value, onChange }: { def: ExtraFieldDef; value: unknown; onChange: (value: unknown) => void }) {
  // an emptied field is removed rather than stored as "": templates test {{#if field}}
  const setText = (text: string) => onChange(text.trim() ? text : undefined);
  switch (def.type) {
    case "textarea":
      return <Textarea value={extraFieldText(value)} placeholder={def.placeholder} onChange={(e) => setText(e.target.value)} className="min-h-16 resize-y" />;
    case "location":
      return <LocationInput value={extraFieldText(value)} placeholder={def.placeholder} onChange={(next) => setText(next)} />;
    case "tags":
      return <TagsInput def={def} value={value} onChange={onChange} />;
    case "select":
      return (
        <Select value={extraFieldText(value) || NONE} onValueChange={(next) => onChange(next === NONE ? undefined : next)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not set</SelectItem>
            {def.options?.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    default:
      return <Input value={extraFieldText(value)} placeholder={def.placeholder} onChange={(e) => setText(e.target.value)} />;
  }
}

/**
 * Inputs for the optional fields declared in shared/profileFields.ts for a section. Declaring a field there is
 * enough for it to appear in the editor of that section.
 */
export default function ExtraFieldsEditor<T extends object>({ section, value, onChange, className }: {
  section: ExtraFieldSection;
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  const fields = EXTRA_FIELDS[section];
  if (!fields.length) return null;
  const record = value as Record<string, unknown>;

  const update = (key: string, next: unknown) => {
    const updated = { ...record };
    if (next === undefined) delete updated[key];
    else updated[key] = next;
    onChange(updated as T);
  };

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {fields.map((def) => (
        <div key={def.key} className={cn("space-y-1.5", def.type === "textarea" && "sm:col-span-2")}>
          <div className="flex items-baseline justify-between gap-2">
            <Label className="text-xs font-medium">{def.label}</Label>
            {def.hint && <span className="text-[11px] text-muted-foreground/70 truncate">{def.hint}</span>}
          </div>
          <ExtraField def={def} value={record[def.key]} onChange={(next) => update(def.key, next)} />
        </div>
      ))}
    </div>
  );
}
