import { DiscoveredJobStatus } from '../../../shared/discovery.types';
import { DEFAULT_HEADER_INFOS, JobApplicationStatus, type CVSessionDataDTO, type JobInfos } from '../../../shared/jobApplications.type';
import type { ProfilesData } from '../../../shared/profilesData.interface';
import { buildCustomKey, type EntityType } from '../../../shared/utils';
import { sameCompany, wordOverlap } from '../../services/discovery/DiscoveryManager';
import { foldText } from '../../utils/text';
import type { Args } from '../core/args';
import type { CallContext } from '../core/context';
import { clip, lines } from '../core/format';
import { newNumbers } from '../core/text';
import { handleOf } from '../core/handles';
import { ToolError, type ToolDef } from '../core/types';
import { evidenceOf, findItem, profileItems, type ProfileItem, type ProfileItemKind } from './profileIndex';

/** A resume already sent stays as it was sent. */
const EDITABLE = [JobApplicationStatus.DRAFT, JobApplicationStatus.REVIEW];

type Session = Omit<CVSessionDataDTO, 'id'> & { id?: string };

interface Start {
  session: Session;
  isNew: boolean;
  opportunityId?: number;
}

/** The editable resume made earlier for the same offer, so drafting twice updates it. */
function existingDraft(ctx: CallContext, offer: { title: string; company: string; url?: string | null }): string | undefined {
  return ctx.applications().find((app) =>
    EDITABLE.includes(app.status) && app.json_file_path
    && ((offer.url && app.url === offer.url) || (sameCompany(app.company_name, offer.company) && wordOverlap(app.job_title, offer.title) >= 0.8)))?.id;
}

async function startFor(ctx: CallContext, jobInfos: JobInfos, opportunityId?: number): Promise<Start> {
  const existing = existingDraft(ctx, jobInfos);
  if (existing) return { ...editableSession(ctx, existing), opportunityId };
  const session: Session = {
    title: `${jobInfos.title} @ ${jobInfos.company}`,
    selection: { headerInfos: { ...DEFAULT_HEADER_INFOS }, selectedExpIds: [], selectedProjectIds: [], selectedBullets: {}, selectedSkillsIds: [], selectedEducationIds: [] },
    jobInfos: { ...jobInfos, keywords: await ctx.deps.offerKeywords(jobInfos.description) },
    customTexts: {},
    scores: {},
  };
  return { session, isNew: true, opportunityId };
}

function editableSession(ctx: CallContext, applicationId: string): Start {
  const app = ctx.application(applicationId);
  const handle = handleOf('application', app.id);
  if (!EDITABLE.includes(app.status)) {
    throw new ToolError(`${handle} is ${app.status}: the resume sent is kept as it was. Draft a new one with "offer" for another offer.`);
  }
  const session = ctx.deps.applications.session(app.id);
  if (!session) throw new ToolError(`${handle} has no resume in CV Maker (added by hand): draft one with "offer" instead.`);
  return { session, isNew: false };
}

async function start(args: Args, ctx: CallContext): Promise<Start> {
  const applicationId = args.string('application_id');
  const opportunityId = args.string('opportunity_id');
  const offer = args.object('offer');
  if ([applicationId, opportunityId, offer].filter(Boolean).length !== 1) {
    throw new ToolError('Give exactly one of application_id, opportunity_id or offer.');
  }
  if (applicationId) return editableSession(ctx, applicationId);
  if (opportunityId) {
    ctx.need('opportunities_read');
    const job = ctx.opportunity(opportunityId);
    return startFor(ctx, { title: job.title, company: job.company, url: job.url ?? '', description: job.description }, job.id);
  }
  return startFor(ctx, {
    title: offer!.string('title', { required: true, max: 200 })!,
    company: offer!.string('company', { required: true, max: 120 })!,
    url: offer!.string('url', { max: 2000 }) ?? '',
    description: offer!.string('description', { required: true, max: 30_000 })!,
  });
}

/** "" when given empty (it then removes a rewrite), undefined when not given. */
const textArg = (args: Args, name: string, max: number) => (args.has(name) ? args.string(name, { max }) ?? '' : undefined);

/** Builds the resume from the arguments; every problem is reported at once, so one retry fixes them all. */
class DraftBuilder {
  readonly problems: string[] = [];
  readonly warnings: string[] = [];
  /** Skills the profile shows but does not declare: they cannot be on the resume until the user adds them. */
  readonly undeclared: string[] = [];
  private readonly items: ProfileItem[];

  constructor(private readonly data: ProfilesData, private readonly session: Session) {
    this.items = profileItems(data);
  }

  private find(ref: string, kind: ProfileItemKind): ProfileItem | undefined {
    const item = findItem(this.items, ref);
    if (item?.kind === kind) return item;
    this.problems.push(`${ref}: no such ${kind} in the profile.`);
    return undefined;
  }

  /** An empty or unchanged text removes the rewrite: the profile's own text shows. */
  private rewrite(type: EntityType, item: ProfileItem, field: string, text: string | undefined, original: string) {
    if (text === undefined) return;
    const key = buildCustomKey(type, item.id, field);
    const customTexts = (this.session.customTexts ??= {});
    if (!text || text === original.trim()) {
      delete customTexts[key];
      return;
    }
    customTexts[key] = text;
    const invented = newNumbers(text, original);
    if (invented.length) this.warnings.push(`${item.handle} ${field}: ${invented.join(', ')} not in the original`);
  }

  headline(text: string | undefined) {
    if (text === undefined) return;
    this.session.selection.headerInfos.title = text || undefined;
  }

  summary(sentences: string[] | undefined) {
    if (!sentences) return;
    this.session.topResumeSummary = sentences;
    const profileText = this.items.map((item) => item.text).join(' ');
    const invented = newNumbers(sentences.join(' '), profileText);
    if (invented.length) this.warnings.push(`summary: ${invented.join(', ')} not found in the profile`);
  }

  experiences(list: Args[]) {
    const ids: string[] = [];
    for (const entry of list) {
      const item = this.find(entry.string('id', { required: true })!, 'experience');
      if (!item) continue;
      const exp = this.data.experience.find((candidate) => candidate.id === item.id)!;
      ids.push(exp.id);
      this.rewrite('experience', item, 'jobTitle', textArg(entry, 'job_title', 120), exp.jobTitle);
      this.rewrite('experience', item, 'description', textArg(entry, 'description', 3000), exp.description ?? '');
    }
    this.session.selection.selectedExpIds = ids;
  }

  projects(list: Args[]) {
    const ids: string[] = [];
    const bullets: Record<string, string[]> = {};
    for (const entry of list) {
      const item = this.find(entry.string('id', { required: true })!, 'project');
      if (!item) continue;
      const project = this.data.projects.find((candidate) => candidate.id === item.id)!;
      ids.push(project.id);
      this.rewrite('project', item, 'title', textArg(entry, 'title', 120), project.title);
      this.rewrite('project', item, 'subtitle', textArg(entry, 'subtitle', 200), project.subtitle ?? '');
      const picked = entry.objects('bullets', { max: 12 });
      bullets[project.id] = picked.length ? [] : project.bullets.map((bullet) => bullet.id);
      for (const pick of picked) {
        const ref = pick.string('id', { required: true })!;
        const bulletItem = this.find(ref, 'bullet');
        if (!bulletItem) continue;
        const bullet = project.bullets.find((candidate) => candidate.id === bulletItem.id);
        if (!bullet) {
          this.problems.push(`${ref} is a bullet of ${handleOf('project', bulletItem.project!.id)}, not of ${item.handle}.`);
          continue;
        }
        bullets[project.id].push(bullet.id);
        this.rewrite('bullet', bulletItem, 'text', textArg(pick, 'text', 500), bullet.text);
      }
    }
    this.session.selection.selectedProjectIds = ids;
    this.session.selection.selectedBullets = bullets;
  }

  skills(refs: string[] | undefined) {
    if (!refs) return;
    const ids: string[] = [];
    const unknown: string[] = [];
    for (const ref of refs) {
      const skill = this.data.skills.find((candidate) => foldText(candidate.name) === foldText(ref)) ?? findItem(this.items, ref);
      if (skill && (!('kind' in skill) || skill.kind === 'skill')) ids.push(skill.id);
      else unknown.push(ref);
    }
    const nowhere: string[] = [];
    for (const ref of unknown) {
      const { handles } = evidenceOf(this.data, this.items, ref);
      if (handles.length) this.undeclared.push(`${ref} (${handles.slice(0, 3).join(', ')})`);
      else nowhere.push(ref);
    }
    if (nowhere.length) {
      this.problems.push(`Found nowhere in the profile: ${nowhere.join(', ')}. Declared skills: ${this.data.skills.map((skill) => skill.name).join(', ')}. ` +
        'If the user has them, they add them to their profile first.');
    }
    this.session.selection.selectedSkillsIds = [...new Set(ids)];
  }

  education(refs: string[] | undefined) {
    if (!refs) return;
    this.session.selection.selectedEducationIds = refs.map((ref) => this.find(ref, 'education')?.id).filter((id): id is string => !!id);
  }
}

const listOrUndefined = (args: Args, name: string, max: number) => (args.has(name) ? args.strings(name, { max, itemMax: 400 }) : undefined);

const REWRITABLE = new Set<string>(['experience', 'project', 'bullet']);

function describe(session: Session, data: ProfilesData): string[] {
  const { selection } = session;
  const rewritten = new Set(Object.keys(session.customTexts ?? {})
    .map((key) => key.split(':'))
    .filter(([type]) => REWRITABLE.has(type))
    .map(([type, id]) => handleOf(type as ProfileItemKind, id)));
  const mark = (handle: string) => (rewritten.has(handle) ? '*' : '');
  const experiences = selection.selectedExpIds.map((id) => {
    const exp = data.experience.find((candidate) => candidate.id === id);
    const handle = handleOf('experience', id);
    return `${handle}${mark(handle)} ${clip(exp ? `${exp.jobTitle} @ ${exp.company}` : '?', 50)}`;
  });
  const projects = selection.selectedProjectIds.map((id) => {
    const handle = handleOf('project', id);
    const bullets = (selection.selectedBullets[id] ?? []).map((bulletId) => handleOf('bullet', bulletId));
    return `${handle}${mark(handle)}: ${bullets.map((bullet) => bullet + mark(bullet)).join(' ') || 'no bullet, so not shown'}`;
  });
  return [
    selection.headerInfos.title ? ` headline: ${selection.headerInfos.title}` : ' no headline',
    session.topResumeSummary?.length ? ` summary: ${session.topResumeSummary.length} sentence${session.topResumeSummary.length > 1 ? 's' : ''}` : ' no summary',
    ` experiences: ${experiences.join(', ') || 'none'}`,
    ` projects: ${projects.join(' | ') || 'none'}`,
    ` skills ${selection.selectedSkillsIds.length} · education ${selection.selectedEducationIds.length} · * = rewritten (${rewritten.size})`,
  ];
}

export const draftResume: ToolDef = {
  name: 'draft_resume',
  permissions: ['resumes_write', 'profile_read'],
  title: 'Draft a tailored resume',
  description:
    'Saves a resume tailored to an offer in CV Maker, in the "AI Review" column, for the user to check, pick a template and export the PDF. ' +
    'You choose the items (handles, in the order they should appear) and may rewrite their texts; the profile itself is never changed. ' +
    'Rewrite only with facts from the profile: no new employer, skill, figure or result. Drafting again for the same offer updates the same draft; ' +
    'for an existing draft, give its application_id and only the sections that change. Use analyze_offer first for the best items.',
  inputSchema: {
    type: 'object',
    properties: {
      application_id: { type: 'string', description: 'A draft to update (DRAFT or REVIEW only).' },
      opportunity_id: { type: 'string', description: 'An offer of the Opportunities queue.' },
      offer: {
        type: 'object',
        properties: { title: { type: 'string' }, company: { type: 'string' }, url: { type: 'string' }, description: { type: 'string' } },
        required: ['title', 'company', 'description'],
        additionalProperties: false,
      },
      headline: { type: 'string', description: 'Title under the name, e.g. "Full-Stack Engineer · TypeScript". Empty string removes it.' },
      summary: { type: 'array', items: { type: 'string' }, maxItems: 4, description: 'Short sentences at the top of the resume.' },
      experiences: {
        type: 'array',
        maxItems: 10,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            job_title: { type: 'string', description: 'Rewritten title (same role, worded for the offer).' },
            description: { type: 'string', description: 'Rewritten description, lines starting with "- ".' },
          },
          required: ['id'],
          additionalProperties: false,
        },
      },
      projects: {
        type: 'array',
        maxItems: 10,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            subtitle: { type: 'string' },
            bullets: {
              type: 'array',
              maxItems: 12,
              description: 'Bullets to show, in order (default: all of them).',
              items: {
                type: 'object',
                properties: { id: { type: 'string' }, text: { type: 'string', description: 'Rewritten bullet.' } },
                required: ['id'],
                additionalProperties: false,
              },
            },
          },
          required: ['id'],
          additionalProperties: false,
        },
      },
      skills: { type: 'array', items: { type: 'string' }, description: 'Skill handles or names (default for a new draft: all).' },
      education: { type: 'array', items: { type: 'string' }, description: 'Education handles (default for a new draft: all).' },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  run: async (args, ctx) => {
    const data = await ctx.profile();
    const { session, isNew, opportunityId } = await start(args, ctx);
    const builder = new DraftBuilder(data, session);

    builder.headline(textArg(args, 'headline', 120));
    builder.summary(listOrUndefined(args, 'summary', 4));
    if (args.has('experiences')) builder.experiences(args.objects('experiences', { max: 10 }));
    if (args.has('projects')) builder.projects(args.objects('projects', { max: 10 }));
    builder.skills(listOrUndefined(args, 'skills', 80) ?? (isNew ? data.skills.map((skill) => skill.id) : undefined));
    builder.education(listOrUndefined(args, 'education', 20) ?? (isNew ? data.education.map((edu) => edu.id) : undefined));

    if (isNew && !session.selection.selectedExpIds.length && !session.selection.selectedProjectIds.length) {
      builder.problems.push('Pick at least one experience or project (analyze_offer suggests the best ones).');
    }
    if (builder.problems.length) throw new ToolError(lines('Nothing saved:', ...builder.problems.map((problem) => ` ${problem}`)));

    const openInEditor = !isNew && ctx.deps.applications.openInEditor() === session.id;
    const saved = ctx.deps.applications.saveDraft(session);
    if (!saved.success) throw new ToolError(`CV Maker could not save the draft: ${saved.error ?? 'unknown error'}`);
    if (opportunityId !== undefined) ctx.deps.opportunities.setStatus(opportunityId, DiscoveredJobStatus.PREPARED);
    const title = session.jobInfos?.title ?? session.title;
    const company = session.jobInfos?.company ?? '';
    ctx.deps.applications.announce({ source: 'claude', action: isNew ? 'created' : 'updated', title, company, fromOffer: opportunityId !== undefined, resumeOf: saved.id });

    return lines(
      `Draft ${handleOf('application', saved.id)} ${isNew ? 'created' : 'updated'} for ${title}${company ? ` @ ${company}` : ''}, in AI Review:`,
      ...describe(session, data),
      builder.warnings.length ? `Check these figures with the user before they send it: ${builder.warnings.join('; ')}` : '',
      builder.undeclared.length
        ? `Not shown, missing from the profile's Skills list though the profile uses them: ${builder.undeclared.join(', ')}. ` +
          'Suggest the user adds them in CV Maker (Profile → Skills), then draft again with them.'
        : '',
      openInEditor ? 'The user has this resume open in the editor: CV Maker asks them to reload it, tell them too, or their next save replaces your changes.' : '',
      'The user opens it in CV Maker (Dashboard → AI Review) to review, choose the template and export the PDF.',
    );
  },
};
