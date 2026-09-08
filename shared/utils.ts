export type EntityType = 'experience' | 'project' | 'bullet' | 'education' | 'skill';

export const buildCustomKey = (entityType: EntityType, id: string, field: string): string => {
  return `${entityType}:${id}:${field}`;
};

export const buildScoreKey = (entityType: EntityType, id: string): string => {
  return `${entityType}:${id}`;
};