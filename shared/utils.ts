/** 'section' holds texts that belong to no profile item, e.g. a template section title (section:<name>:title). */
export type EntityType = 'experience' | 'project' | 'bullet' | 'education' | 'skill' | 'section';

export const buildCustomKey = (entityType: EntityType, id: string, field: string): string => {
  return `${entityType}:${id}:${field}`;
};

export const buildScoreKey = (entityType: EntityType, id: string): string => {
  return `${entityType}:${id}`;
};

/**
 * Parses a date coming from SQLite. CURRENT_TIMESTAMP is stored as UTC without a timezone ("2026-11-16 09:30:00"),
 * which browsers would otherwise read as local time; ISO strings with an explicit zone are left untouched.
 */
export const parseDbDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const isNaiveSqlite = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value);
  const date = new Date(isNaiveSqlite ? `${value.replace(' ', 'T')}Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Normalizes a salary (form input or IPC payload) to a non-negative integer, or null when empty/invalid.
 */
export const parseSalary = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount);
};