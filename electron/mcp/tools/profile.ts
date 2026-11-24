import type { ProfilesData } from '../../../shared/profilesData.interface';
import { cosineSimilarity } from '../../utils/math';
import type { CallContext } from '../core/context';
import { clip, lines, parts, period } from '../core/format';
import { handleOf } from '../core/handles';
import { keywordScore, terms } from '../core/text';
import type { ToolDef } from '../core/types';
import { findItem, PROFILE_ITEM_KINDS, profileItems, type ProfileItem } from './profileIndex';

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

/** Cosine of the query with each indexed experience and bullet; null when the local model or index is not there. */
async function semanticScores(ctx: CallContext, query: string): Promise<Map<string, number> | null> {
  try {
    const index = ctx.deps.profileVectors();
    if (!index.experiences.length && !index.bullets.length) return null;
    const queryVector = await ctx.deps.embed(query);
    const scores = new Map<string, number>();
    for (const { id, vector } of [...index.experiences, ...index.bullets]) scores.set(id, cosineSimilarity(queryVector, vector));
    return scores;
  } catch (error) {
    console.warn('[MCP] Semantic search unavailable, keywords only:', error);
    return null;
  }
}

/** MiniLM cosines of related texts sit around 0.3-0.6: spread that range over 0..1. */
const spread = (cosine: number) => Math.min(1, Math.max(0, (cosine - 0.15) / 0.5));

export function scoreItems(items: ProfileItem[], query: string, semantic: Map<string, number> | null): { item: ProfileItem; score: number }[] {
  const queryTerms = terms(query);
  const semanticOf = (item: ProfileItem): number | undefined => {
    if (!semantic) return undefined;
    if (item.kind === 'experience' || item.kind === 'bullet') return semantic.get(item.id);
    if (item.kind === 'project') {
      const bullets = items.filter((other) => other.kind === 'bullet' && other.project?.id === item.id).map((bullet) => semantic.get(bullet.id) ?? 0);
      return bullets.length ? Math.max(...bullets) : undefined;
    }
    return undefined;
  };
  return items
    .map((item) => {
      const keywords = keywordScore(queryTerms, item.text);
      const meaning = semanticOf(item);
      return { item, score: meaning === undefined ? keywords : 0.65 * spread(meaning) + 0.35 * keywords };
    })
    .filter(({ score }) => score > 0.05)
    .sort((a, b) => b.score - a.score);
}

function matchLine({ item, score }: { item: ProfileItem; score: number }): string {
  const head = `${item.handle} ${Math.round(score * 100)} ${item.kind}`;
  switch (item.kind) {
    case 'bullet':
      return `${head} in ${handleOf('project', item.project!.id)} ${clip(item.project!.title, 40)}: ${clip(item.label, 160)}`;
    case 'experience':
    case 'education':
      return item.excerpt ? `${head} ${item.label}: ${clip(item.excerpt, 120)}` : `${head} ${item.label}`;
    default:
      return `${head} ${clip(item.label, 100)}`;
  }
}

export const searchProfile: ToolDef = {
  name: 'search_profile',
  title: 'Search the profile',
  description:
    'Finds the experiences, projects, bullets, education and skills that best match a need, computed locally (embeddings + keywords). ' +
    'Query in plain words or keywords, e.g. "led a team", "kubernetes ci/cd". Answers handles, a 0-100 score and a short excerpt.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'What to look for.' },
      kinds: { type: 'array', items: { type: 'string', enum: PROFILE_ITEM_KINDS }, description: 'Limit to these kinds (default: all).' },
      limit: { type: 'integer', minimum: 1, maximum: 25, default: 8 },
    },
    required: ['query'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const query = args.string('query', { required: true, max: 300 });
    const kinds = args.oneOfList('kinds', PROFILE_ITEM_KINDS);
    const limit = args.number('limit', { min: 1, max: 25, fallback: 8 });
    const items = profileItems(await ctx.profile());
    const semantic = await semanticScores(ctx, query);
    const ranked = scoreItems(items, query, semantic).filter(({ item }) => !kinds.length || kinds.includes(item.kind));
    const matches: typeof ranked = [];
    for (const match of ranked) {
      if (matches.length >= limit) break;
      // a project scored through its best bullet: that bullet's line already names the project
      const toldByBullet = match.item.kind === 'project'
        && ranked.some((other) => other.item.kind === 'bullet' && other.item.project?.id === match.item.id && other.score >= match.score - 1e-6);
      if (!toldByBullet) matches.push(match);
    }
    if (!matches.length) return `Nothing in the profile matches "${query}".`;
    return lines(
      `Best matches for "${query}" (${semantic ? 'meaning + keywords' : 'keywords only: the local index is not built yet, the resume editor builds it'}):`,
      ...matches.map(matchLine),
    );
  },
};

const tagsOf = (tags: string[] | undefined) => (tags?.length ? ` [${tags.join(', ')}]` : '');

function itemDetail(item: ProfileItem, data: ProfilesData): string {
  switch (item.kind) {
    case 'experience': {
      const exp = data.experience.find((candidate) => candidate.id === item.id)!;
      const projects = data.projects.filter((project) => project.relatedExperienceId === exp.id);
      return lines(
        parts(`${item.handle} experience: ${exp.jobTitle} @ ${exp.company}`, exp.location, period(exp.startDate, exp.endDate)),
        exp.description ? `  ${exp.description.trim()}` : '  (no description)',
        projects.length ? `  projects: ${projects.map((project) => `${handleOf('project', project.id)} ${project.title}`).join(', ')}` : '',
      );
    }
    case 'project': {
      const project = data.projects.find((candidate) => candidate.id === item.id)!;
      return lines(
        parts(
          `${item.handle} project: ${project.title}`,
          project.subtitle,
          period(project.startDate, project.endDate),
          project.relatedExperienceId ? `in ${handleOf('experience', project.relatedExperienceId)}` : '',
        ),
        project.useCase ? `  use case: ${project.useCase}` : '',
        project.stack?.length ? `  stack: ${project.stack.join(', ')}` : '',
        project.link ? `  link: ${project.link}` : '',
        ...project.bullets.map((bullet) => `  ${handleOf('bullet', bullet.id)} ${bullet.text}${tagsOf(bullet.tags)}`),
      );
    }
    case 'bullet': {
      const bullet = item.project!.bullets.find((candidate) => candidate.id === item.id)!;
      return `${item.handle} bullet in ${handleOf('project', item.project!.id)} ${item.project!.title}: ${bullet.text}${tagsOf(bullet.tags)}`;
    }
    case 'education': {
      const edu = data.education.find((candidate) => candidate.id === item.id)!;
      return lines(
        parts(`${item.handle} ${edu.kind ?? 'education'}: ${edu.degree} — ${edu.institution}`, edu.location, period(edu.startDate, edu.endDate)),
        edu.description ? `  ${edu.description.trim()}` : '',
      );
    }
    case 'skill': {
      const skill = data.skills.find((candidate) => candidate.id === item.id)!;
      return parts(`${item.handle} skill: ${skill.name}`, skill.category, skill.proficiency);
    }
  }
}

export const getProfileItems: ToolDef = {
  name: 'get_profile_items',
  title: 'Read profile items',
  description: 'Full text of profile items by handle (from profile_overview or search_profile). A project comes with all its bullets.',
  inputSchema: {
    type: 'object',
    properties: { ids: { type: 'array', items: { type: 'string' }, maxItems: 30, description: 'Handles, e.g. ["e98427c", "pad7da0"].' } },
    required: ['ids'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const refs = args.strings('ids', { max: 30 });
    if (!refs.length) return 'Give at least one handle.';
    const data = await ctx.profile();
    const items = profileItems(data);
    const found: string[] = [];
    const missing: string[] = [];
    for (const ref of new Set(refs)) {
      const item = findItem(items, ref);
      if (item) found.push(itemDetail(item, data));
      else missing.push(ref);
    }
    return lines(...found, missing.length ? `Not in the profile: ${missing.join(', ')}` : '');
  },
};
