export type EntityType = 'experience' | 'project' | 'bullet' | 'education' | 'skill';

export const buildCustomKey = (entityType: EntityType, id: string, field: string): string => {
  return `${entityType}:${id}:${field}`;
};

export const buildScoreKey = (entityType: EntityType, id: string): string => {
  return `${entityType}:${id}`;
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