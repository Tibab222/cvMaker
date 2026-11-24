import type { Project, ProjectBullet } from '../../../shared/projects.interface';
import type { ProfilesData } from '../../../shared/profilesData.interface';
import { handleOf, kindOfHandle, type HandleKind } from '../core/handles';

export type ProfileItemKind = Extract<HandleKind, 'experience' | 'project' | 'bullet' | 'education' | 'skill'>;
export const PROFILE_ITEM_KINDS: readonly ProfileItemKind[] = ['experience', 'project', 'bullet', 'education', 'skill'];

export interface ProfileItem {
  kind: ProfileItemKind;
  id: string;
  handle: string;
  /** Short name, e.g. "Developer @ Acme". */
  label: string;
  /** All the searchable text. */
  text: string;
  /** Experiences and education: their description. */
  excerpt?: string;
  /** Bullets: the project they belong to. */
  project?: Project;
}

const bulletText = (bullet: ProjectBullet) => `${bullet.text} ${bullet.tags?.join(' ') ?? ''}`;

/** Every item of the profile, flat, with its handle. */
export function profileItems(data: ProfilesData): ProfileItem[] {
  const items: ProfileItem[] = [];
  for (const exp of data.experience) {
    items.push({ kind: 'experience', id: exp.id, handle: handleOf('experience', exp.id), label: `${exp.jobTitle} @ ${exp.company}`, text: `${exp.jobTitle} ${exp.company} ${exp.description ?? ''}`, excerpt: exp.description });
  }
  for (const project of data.projects) {
    items.push({
      kind: 'project',
      id: project.id,
      handle: handleOf('project', project.id),
      label: project.title,
      text: `${project.title} ${project.subtitle ?? ''} ${project.useCase ?? ''} ${project.stack?.join(' ') ?? ''} ${project.bullets.map(bulletText).join(' ')}`,
    });
    for (const bullet of project.bullets) {
      items.push({ kind: 'bullet', id: bullet.id, handle: handleOf('bullet', bullet.id), label: bullet.text, text: bulletText(bullet), project });
    }
  }
  for (const edu of data.education) {
    items.push({ kind: 'education', id: edu.id, handle: handleOf('education', edu.id), label: `${edu.degree} — ${edu.institution}`, text: `${edu.degree} ${edu.institution} ${edu.description ?? ''}`, excerpt: edu.description });
  }
  for (const skill of data.skills) {
    items.push({ kind: 'skill', id: skill.id, handle: handleOf('skill', skill.id), label: skill.name, text: `${skill.name} ${skill.category ?? ''}` });
  }
  return items;
}

/** A handle or raw id; undefined when not in the profile. */
export function findItem(items: ProfileItem[], ref: string): ProfileItem | undefined {
  const wanted = ref.trim();
  const kind = kindOfHandle(wanted);
  return items.find((item) => item.id === wanted) ?? (kind ? items.find((item) => item.kind === kind && item.handle === wanted) : undefined);
}
