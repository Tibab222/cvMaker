import { createHash } from 'crypto';
import { ToolError } from './types';

/**
 * Short handles for the app's ids: a UUID costs ~25 tokens, "b3fa9c1" ~4. Derived from a hash of the id,
 * so they stay stable across calls without storing anything.
 */
export type HandleKind = 'experience' | 'project' | 'bullet' | 'education' | 'skill' | 'application' | 'opportunity' | 'question' | 'answer';

const PREFIX: Record<HandleKind, string> = {
  experience: 'e',
  project: 'p',
  bullet: 'b',
  education: 'd',
  skill: 's',
  application: 'a',
  opportunity: 'o',
  question: 'q',
  answer: 'f',
};
const KIND_BY_PREFIX = new Map(Object.entries(PREFIX).map(([kind, prefix]) => [prefix, kind as HandleKind]));
const HASH_LENGTH = 6;

export function handleOf(kind: HandleKind, id: string | number): string {
  // already short integers
  if (kind === 'opportunity') return `o${id}`;
  return PREFIX[kind] + createHash('sha1').update(String(id)).digest('hex').slice(0, HASH_LENGTH);
}

export function kindOfHandle(handle: string): HandleKind | undefined {
  if (!/^[a-z][0-9a-f]+$/.test(handle) && !/^o\d+$/.test(handle)) return undefined;
  return KIND_BY_PREFIX.get(handle[0]);
}

/** Accepts a handle or a raw id. */
export function resolveHandle<T>(kind: HandleKind, handle: string, items: T[], idOf: (item: T) => string | number): T | undefined {
  const wanted = handle.trim();
  const direct = items.find((item) => String(idOf(item)) === wanted);
  if (direct) return direct;
  if (kindOfHandle(wanted) !== kind) return undefined;
  const matches = items.filter((item) => handleOf(kind, idOf(item)) === wanted);
  if (matches.length > 1) throw new ToolError(`Handle ${wanted} is ambiguous: use the full id.`);
  return matches[0];
}
