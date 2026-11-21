import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildProjectDate, parseProjectDate } from "@shared/projectDates";
import type { ProjectDate } from "@shared/projects.interface";

const NO_MONTH = "none";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(Date.UTC(2000, i, 1)).toLocaleDateString(undefined, { month: "long", timeZone: "UTC" }),
}));

interface Props {
  id: string;
  label: string;
  value: ProjectDate | undefined;
  onChange: (value: ProjectDate | undefined) => void;
}

/**
 * Year (required for the date to count) plus an optional month, stored as "YYYY" or "YYYY-MM".
 * The year is kept locally while it is being typed, so a partial year does not wipe the field.
 */
export default function ProjectDateInput({ id, label, value, onChange }: Props) {
  const parsed = parseProjectDate(value);
  const [year, setYear] = useState(parsed ? String(parsed.year) : "");
  const [month, setMonth] = useState<number | undefined>(parsed?.month);

  // follow outside changes (cancel, another project loaded) without fighting the user's typing
  useEffect(() => {
    const syncFromValue = () => {
      if (buildProjectDate(year, month) === value) return;
      const next = parseProjectDate(value);
      setYear(next ? String(next.year) : "");
      setMonth(next?.month);
    };
    syncFromValue();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the value coming from the parent
  }, [value]);

  const update = (nextYear: string, nextMonth: number | undefined) => {
    setYear(nextYear);
    setMonth(nextMonth);
    onChange(buildProjectDate(nextYear, nextMonth));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <Select
        value={month ? String(month) : NO_MONTH}
        onValueChange={(next) => update(year, next === NO_MONTH ? undefined : Number(next))}
      >
        <SelectTrigger id={`${id}-month`} aria-label={`${label} month`} className="w-32">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_MONTH} className="text-muted-foreground">No month</SelectItem>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={`${id}-year`}
        aria-label={`${label} year`}
        inputMode="numeric"
        maxLength={4}
        placeholder="Year"
        value={year}
        onChange={(e) => update(e.target.value.replace(/\D/g, "").slice(0, 4), month)}
        className="w-20 tabular-nums"
      />
    </div>
  );
}
