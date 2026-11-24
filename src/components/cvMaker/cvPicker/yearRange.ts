/** Formats "2021 – Present" for the picker lists. */
export const yearRange = (start: Date | string | undefined, end: Date | string | undefined, present = "Present") => {
  const year = (value: Date | string | undefined) => {
    if (!value) return "";
    if (value === "Present") return present;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
  };
  const from = year(start);
  const to = year(end);
  if (from && to && from !== to) return `${from} – ${to}`;
  return from || to;
};
