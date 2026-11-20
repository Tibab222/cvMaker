/** Lowercase, no accents, single spaces: "  Société Générale " and "societe generale" are the same company. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface Suggestion {
  value: string;
  /** How many past applications use it. */
  count: number;
  /** Most recent use, ms. */
  lastUsed: number;
  /** Shown under the value ("at Acme"). */
  hint?: string;
}

/**
 * Distinct values (accents and case ignored), the spelling used most recently, most used first.
 * @param entries one per past application
 */
export function collectSuggestions(entries: { value: string; at: number }[]): Suggestion[] {
  const byKey = new Map<string, Suggestion>();
  for (const { value, at } of entries) {
    const clean = value.replace(/\s+/g, " ").trim();
    const key = fold(clean);
    if (!key || key === "unknown") continue;
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, { value: clean, count: 1, lastUsed: at });
    else {
      existing.count++;
      if (at > existing.lastUsed) Object.assign(existing, { value: clean, lastUsed: at });
    }
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
}

/**
 * Suggestions for what is typed: words starting with it first, then anywhere in the value.
 * An exact match is left out (nothing left to complete).
 */
export function filterSuggestions(all: Suggestion[], query: string, limit = 8): Suggestion[] {
  const needle = fold(query);
  if (!needle) return all.slice(0, limit);
  const starts: Suggestion[] = [];
  const contains: Suggestion[] = [];
  for (const suggestion of all) {
    const key = fold(suggestion.value);
    if (key === needle) continue;
    if (key.startsWith(needle) || key.split(/[\s\-/(),.]+/).some((word) => word.startsWith(needle))) starts.push(suggestion);
    else if (key.includes(needle)) contains.push(suggestion);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Where the typed text sits in a suggestion, to highlight it. Null when it is not a plain substring (accents). */
export function matchRange(value: string, query: string): [number, number] | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  const index = value.toLowerCase().indexOf(needle);
  return index === -1 ? null : [index, index + needle.length];
}
