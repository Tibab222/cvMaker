/** One line, whitespace collapsed, cut at `max` characters. */
export function clip(text: string | null | undefined, max: number): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Line breaks kept; says how much is left and how to get it, so the model asks only when it needs it. */
export function clipLong(text: string | null | undefined, max: number, howToGetMore: string): string {
  const clean = (text ?? '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}… [+${clean.length - max} chars: ${howToGetMore}]`;
}

export function day(value: string | Date | null | undefined): string {
  if (!value) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return text.slice(0, 10);
}

/** "2026-11-28 14:00" in the user's time zone (stored dates are UTC). */
export function localDateTime(value: string | null | undefined): string {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Profile dates are ISO strings, "YYYY", "YYYY-MM" or 'Present'. */
export function month(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (value === 'Present') return 'now';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}$/.test(text) ? text : text.slice(0, 7);
}

export function period(start: string | Date | null | undefined, end: string | Date | null | undefined): string {
  const from = month(start);
  const to = month(end);
  if (!from && !to) return '';
  return `${from || '?'} → ${to || 'now'}`;
}

export function money(amount: number | null | undefined): string {
  if (!amount) return '';
  return amount >= 1000 ? `${Math.round(amount / 1000)}k` : String(amount);
}

/** Joins the non-empty parts with " · ". */
export function parts(...values: (string | number | null | undefined | false)[]): string {
  return values.filter((value) => value !== null && value !== undefined && value !== false && value !== '').join(' · ');
}

export function lines(...values: (string | null | undefined | false)[]): string {
  return values.filter((value) => typeof value === 'string' && value.length > 0).join('\n');
}

/** "APPLIED 12 · REJECTED 5", most frequent first. */
export function countBy<T>(items: T[], key: (item: T) => string): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(' · ');
}
