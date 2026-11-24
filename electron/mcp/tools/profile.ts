import type { ProfilesData } from '../../../shared/profilesData.interface';
import { clip, lines, parts, period } from '../core/format';
import { handleOf } from '../core/handles';
import type { ToolDef } from '../core/types';

/** Only whether they exist is told: no link value, mail, phone or photo leaves the app. */
const LINK_FIELDS = ['portfolio', 'linkedin', 'github', 'twitter', 'instagram', 'tiktok', 'youtube', 'facebook'] as const;

const time = (value: unknown) => {
  const date = value ? new Date(String(value)).getTime() : NaN;
  return Number.isNaN(date) ? 0 : date;
};

/** Ongoing first, then most recent. */
export function byRecency<T extends { startDate?: unknown; endDate?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ongoingA = !a.endDate || a.endDate === 'Present' ? 1 : 0;
    const ongoingB = !b.endDate || b.endDate === 'Present' ? 1 : 0;
    return ongoingB - ongoingA || time(b.startDate) - time(a.startDate);
  });
}

function skillsLine(skills: ProfilesData['skills']): string {
  const groups = new Map<string, string[]>();
  for (const skill of skills) {
    const category = skill.category?.trim() || 'Other';
    const label = skill.proficiency ? `${skill.name} (${skill.proficiency})` : skill.name;
    groups.set(category, [...(groups.get(category) ?? []), label]);
  }
  return [...groups.entries()].map(([category, names]) => `${category}: ${names.join(', ')}`).join('; ');
}

export const profileOverview: ToolDef = {
  name: 'profile_overview',
  title: 'Profile overview',
  description:
    "Map of the user's master profile in CV Maker: every experience, project, education item and skill on one line, with its handle. " +
    'Start here. Never includes contact details or the photo. Use search_profile to find items for an offer, get_profile_items for full texts.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (_args, ctx) => {
    const { profile, experience, projects, skills, education } = await ctx.profile();
    const projectsByExperience = new Map<string, number>();
    for (const project of projects) {
      if (project.relatedExperienceId) projectsByExperience.set(project.relatedExperienceId, (projectsByExperience.get(project.relatedExperienceId) ?? 0) + 1);
    }
    const links: string[] = [...LINK_FIELDS.filter((field) => profile[field]), ...(profile.customLinks ?? []).map((link) => link.label)];
    const bulletCount = projects.reduce((count, project) => count + project.bullets.length, 0);

    return lines(
      parts(`Profile: ${profile.firstName} ${profile.lastName}`, `resume language ${profile.language}`, profile.location),
      links.length ? `Links on file: ${links.join(', ')}` : '',
      `\nExperiences (${experience.length}):`,
      ...byRecency(experience).map((exp) => ' ' + parts(
        `${handleOf('experience', exp.id)} ${exp.jobTitle} @ ${exp.company}`,
        exp.location,
        period(exp.startDate, exp.endDate),
        projectsByExperience.get(exp.id) ? `${projectsByExperience.get(exp.id)} projects` : '',
      )),
      `\nProjects (${projects.length}, ${bulletCount} bullets):`,
      ...byRecency(projects).map((project) => ' ' + parts(
        `${handleOf('project', project.id)} ${project.title}${project.subtitle ? ` — ${clip(project.subtitle, 60)}` : ''}`,
        period(project.startDate, project.endDate),
        project.relatedExperienceId ? `in ${handleOf('experience', project.relatedExperienceId)}` : '',
        project.stack?.length ? `stack: ${project.stack.slice(0, 6).join(', ')}` : '',
        `${project.bullets.length} bullets`,
      )),
      `\nSkills (${skills.length}): ${skillsLine(skills)}`,
      `\nEducation (${education.length}):`,
      ...byRecency(education).map((edu) => ' ' + parts(
        `${handleOf('education', edu.id)} ${edu.degree} — ${edu.institution}`,
        period(edu.startDate, edu.endDate),
        edu.kind && edu.kind !== 'degree' ? edu.kind : '',
      )),
    );
  },
};
