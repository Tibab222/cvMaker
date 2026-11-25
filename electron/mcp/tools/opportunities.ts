import { DiscoveredJobStatus, type DiscoveredJob } from '../../../shared/discovery.types';
import type { JobScore } from '../../services/discovery/scoring';
import { sameCompany, wordOverlap } from '../../services/discovery/DiscoveryManager';
import { foldText } from '../../utils/text';
import type { Args } from '../core/args';
import type { CallContext } from '../core/context';
import { clip, clipLong, countBy, day, lines, parts } from '../core/format';
import { handleOf } from '../core/handles';
import { terms } from '../core/text';
import { ToolError, type ToolDef } from '../core/types';
import { bestMatches, matchLine, scoreItems, semanticScores } from './profile';
import { evidenceOf, isDeclaredSkill, profileItems } from './profileIndex';

const STATUSES = Object.values(DiscoveredJobStatus);
const TRIAGE_STATUSES = [DiscoveredJobStatus.NEW, DiscoveredJobStatus.SHORTLISTED, DiscoveredJobStatus.DISMISSED];
const EVIDENCE_KINDS = new Set(['experience', 'project', 'bullet']);

/** Drops what the extractor lets through that is no skill: the company's own name, grammar words ("ARE"). */
const telling = (keywords: string[], company: string) => keywords.filter((keyword) => terms(keyword).length > 0 && !sameCompany(keyword, company));

function opportunityLine(job: DiscoveredJob): string {
  const matched = telling(job.matched_keywords, job.company).slice(0, 4);
  const missing = telling(job.missing_keywords, job.company).slice(0, 3);
  return parts(
    `${handleOf('opportunity', job.id)} ${job.score ?? '–'} ${clip(job.title, 70)} @ ${clip(job.company, 40)}`,
    clip(job.location, 40),
    job.remote ? 'remote' : '',
    clip(job.salary, 30),
    job.posted_at ? `posted ${day(job.posted_at)}` : `found ${day(job.discovered_at)}`,
    job.status,
    job.origin === 'external_ai' ? `added by ${job.added_by ?? 'an AI'}` : '',
    job.application_id ? `applied as ${handleOf('application', job.application_id)}` : '',
    matched.length ? `+${matched.join(', ')}` : '',
    missing.length ? `−${missing.join(', ')}` : '',
  );
}

export const listOpportunities: ToolDef = {
  name: 'list_opportunities',
  permissions: ['opportunities_read'],
  title: 'List job opportunities',
  description:
    "Offers in CV Maker's Opportunities queue (found by its daily job-board search or saved while browsing), best match first. " +
    'Each line: handle, local match score 0-100, title, company, place, status, +skills the profile has, −skills it lacks. ' +
    'analyze_offer goes deeper on one.',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'array', items: { type: 'string', enum: STATUSES }, description: 'Default: NEW and SHORTLISTED.' },
      min_score: { type: 'integer', minimum: 0, maximum: 100 },
      remote: { type: 'boolean', description: 'Only remote offers.' },
      search: { type: 'string', description: 'Text in the title, company or location.' },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 15 },
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const statuses = args.oneOfList('status', STATUSES);
    const wanted = statuses.length ? statuses : [DiscoveredJobStatus.NEW, DiscoveredJobStatus.SHORTLISTED];
    const minScore = args.number('min_score', { min: 0, max: 100, fallback: 0 });
    const remoteOnly = args.boolean('remote') ?? false;
    const search = foldText(args.string('search', { max: 100 }) ?? '');
    const limit = args.number('limit', { min: 1, max: 50, fallback: 15 });
    const offset = args.number('offset', { min: 0, fallback: 0 });

    const all = ctx.opportunities();
    if (!all.length) return 'The Opportunities queue is empty: the user can add job boards or a keyword search in CV Maker, or you can queue offers with update_opportunities.';
    const matching = all.filter((job) =>
      wanted.includes(job.status)
      && (job.score ?? 0) >= minScore
      && (!remoteOnly || job.remote)
      && (!search || foldText(`${job.title} ${job.company} ${job.location ?? ''}`).includes(search)));
    const page = matching.slice(offset, offset + limit);

    return lines(
      `${all.length} offers in the queue: ${countBy(all, (job) => job.status)}`,
      `${matching.length} match (${wanted.join(', ')}${minScore ? `, score ≥ ${minScore}` : ''}${remoteOnly ? ', remote' : ''}), showing ${page.length ? `${offset + 1}-${offset + page.length}` : 'none'}:`,
      ...page.map(opportunityLine),
      offset + page.length < matching.length ? `… ${matching.length - offset - page.length} more (offset ${offset + page.length})` : '',
    );
  },
};

interface Target {
  title: string;
  company: string;
  description: string;
  header: string;
  /** Kept score of a queued offer, so the answer agrees with the queue. */
  score?: JobScore;
  applicationId?: string;
  saved: boolean;
}

function readTarget(args: Args, ctx: CallContext): Target {
  const opportunityId = args.string('opportunity_id');
  const applicationId = args.string('application_id');
  const offer = args.object('offer');
  if ([opportunityId, applicationId, offer].filter(Boolean).length !== 1) {
    throw new ToolError('Give exactly one of opportunity_id, application_id or offer.');
  }
  if (opportunityId) {
    const job = ctx.opportunity(opportunityId);
    return {
      title: job.title,
      company: job.company,
      description: job.description,
      header: opportunityLine({ ...job, matched_keywords: [], missing_keywords: [] }),
      score: job.score === null ? undefined : { score: job.score, matched: job.matched_keywords, missing: job.missing_keywords },
      applicationId: job.application_id ?? undefined,
      saved: true,
    };
  }
  if (applicationId) {
    ctx.need('applications_read');
    const app = ctx.application(applicationId);
    return {
      title: app.job_title,
      company: app.company_name,
      description: app.description ?? '',
      header: parts(`${handleOf('application', app.id)} ${app.job_title} @ ${app.company_name}`, app.status, app.applied_at ? `sent ${day(app.applied_at)}` : ''),
      applicationId: app.id,
      saved: true,
    };
  }
  const title = offer!.string('title', { required: true, max: 200 })!;
  const company = offer!.string('company', { max: 120 }) ?? '';
  return {
    title,
    company,
    description: offer!.string('description', { required: true, max: 30_000 })!,
    header: company ? `${title} @ ${company}` : title,
    saved: false,
  };
}

async function vaultLine(ctx: CallContext, target: Target): Promise<string> {
  try {
    const matches = (await ctx.deps.vaultMatch({ title: target.title, description: target.description }, 3)).filter((match) => match.score > 0);
    if (!matches.length) return '';
    return `Finished resumes in the vault: ${matches.map((match) => {
      const lacks = telling(match.missing, target.company).slice(0, 3);
      return parts(`"${match.name}" ${match.score}`, lacks.length ? `lacks ${lacks.join(', ')}` : '');
    }).join(' | ')}`;
  } catch (error) {
    console.warn('[MCP] Vault match failed:', error);
    return '';
  }
}

function historyLines(ctx: CallContext, target: Target): string[] {
  if (!ctx.allows('applications_read')) return [];
  const others = ctx.applications().filter((app) => app.id !== target.applicationId);
  const atCompany = target.company ? others.filter((app) => sameCompany(app.company_name, target.company)) : [];
  const alike = others.filter((app) => app.applied_at && wordOverlap(app.job_title, target.title) >= 0.5);
  const interviewed = ctx.deps.applications.interviewedIds();
  return [
    atCompany.length
      ? `Already at this company: ${atCompany.slice(0, 4).map((app) => parts(`${handleOf('application', app.id)} ${clip(app.job_title, 50)}`, app.status, day(app.applied_at ?? app.created_at))).join(' | ')}`
      : '',
    alike.length
      ? `Similar titles applied to: ${alike.length}, ${alike.filter((app) => interviewed.has(app.id)).length} reached an interview (${countBy(alike, (app) => app.status)})`
      : '',
  ];
}

export const analyzeOffer: ToolDef = {
  name: 'analyze_offer',
  permissions: ['opportunities_read', 'profile_read'],
  title: 'Analyze a job offer',
  description:
    'Matches one offer against the profile, all computed locally: 0-100 score, skills the profile has and lacks, the best experiences and bullets to put forward ' +
    '(handles), the closest finished resumes, and past applications to the same company or similar titles. ' +
    'Give a queued offer (opportunity_id), an application (application_id) or the text of any offer (offer).',
  inputSchema: {
    type: 'object',
    properties: {
      opportunity_id: { type: 'string', description: 'Handle from list_opportunities, e.g. "o42".' },
      application_id: { type: 'string', description: 'Handle from list_applications.' },
      offer: {
        type: 'object',
        properties: { title: { type: 'string' }, company: { type: 'string' }, description: { type: 'string', description: 'The full offer text.' } },
        required: ['title', 'description'],
        additionalProperties: false,
      },
      evidence: { type: 'integer', minimum: 1, maximum: 15, default: 6, description: 'How many profile items to put forward.' },
      offer_chars: { type: 'integer', minimum: 0, maximum: 20000, default: 2500, description: 'Offer text to include for a saved offer (0: none).' },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const target = readTarget(args, ctx);
    const evidenceCount = args.number('evidence', { min: 1, max: 15, fallback: 6 });
    const offerChars = args.number('offer_chars', { min: 0, max: 20_000, fallback: 2500 });

    const offerText = { title: target.title, description: target.description };
    const [score, profile, semantic, vault] = await Promise.all([
      target.score ? Promise.resolve(target.score) : ctx.deps.opportunities.score(offerText),
      ctx.profile(),
      semanticScores(ctx, `${target.title}\n${target.description.slice(0, 1500)}`),
      vaultLine(ctx, target),
    ]);
    const has = telling(score?.matched ?? [], target.company);
    const lacks = telling(score?.missing ?? [], target.company);
    const keywordQuery = [target.title, ...has, ...lacks].join(', ');
    const allItems = profileItems(profile);
    const items = allItems.filter((item) => EVIDENCE_KINDS.has(item.kind));
    const undeclared = has
      .filter((term) => !isDeclaredSkill(profile, term))
      .map((term) => ({ term, evidence: evidenceOf(profile, allItems, term) }))
      .filter(({ evidence }) => evidence.tagged);
    const evidence = bestMatches(scoreItems(items, keywordQuery, semantic), evidenceCount);

    return lines(
      `Offer: ${target.header}`,
      target.description.trim() ? '' : 'No offer text saved: the match only uses the title.',
      score ? `Match ${score.score}/100` : 'No match score: the profile has no skills or experience yet.',
      has.length ? `Profile has: ${has.join(', ')}` : '',
      lacks.length ? `Offer asks, not in the profile: ${lacks.join(', ')}` : '',
      undeclared.length
        ? `Used in the profile but missing from its Skills list (a resume can only show declared skills): ${undeclared.map(({ term, evidence }) => `${term} (${evidence.handles.slice(0, 3).join(', ')})`).join(', ')}`
        : '',
      evidence.length ? `Best evidence (${semantic ? 'meaning + keywords' : 'keywords only'}):` : 'Nothing in the profile stands out for this offer.',
      ...evidence.map((match) => ' ' + matchLine(match)),
      vault,
      ...historyLines(ctx, target),
      target.saved
        ? offerChars && target.description.trim() ? `Offer text:\n${clipLong(target.description, offerChars, 'call again with a higher offer_chars')}` : ''
        : 'Not saved in CV Maker: update_opportunities can queue it, record_application once it is sent.',
    );
  },
};

const opportunityNumber = (ref: string): number => {
  const match = /^o?(\d+)$/.exec(ref.trim());
  if (!match) throw new ToolError(`"${ref}" is not an opportunity handle (o42).`);
  return Number(match[1]);
};

export const updateOpportunities: ToolDef = {
  name: 'update_opportunities',
  permissions: ['opportunities_write'],
  title: 'Queue or triage opportunities',
  description:
    'Adds offers to the Opportunities queue (scored locally and shortlisted; one already queued is shortlisted again) and/or sorts queued ones: ' +
    'SHORTLISTED to keep, DISMISSED to drop, NEW to undo. The user sees the queue change in CV Maker.',
  inputSchema: {
    type: 'object',
    properties: {
      add: {
        type: 'array',
        maxItems: 10,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            company: { type: 'string' },
            description: { type: 'string', description: 'The full offer text.' },
            url: { type: 'string' },
            salary: { type: 'string' },
          },
          required: ['title', 'company', 'description'],
          additionalProperties: false,
        },
      },
      triage: {
        type: 'array',
        maxItems: 50,
        items: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Opportunity handle.' }, status: { type: 'string', enum: TRIAGE_STATUSES } },
          required: ['id', 'status'],
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const additions = args.objects('add', { max: 10 }).map((offer) => ({
      title: offer.string('title', { required: true, max: 200 })!,
      company: offer.string('company', { required: true, max: 120 })!,
      mandate: offer.string('description', { required: true, max: 30_000 })!,
      url: offer.string('url', { max: 2000 }) ?? '',
      salary: offer.string('salary', { max: 100 }),
      extractedAt: new Date().toISOString(),
    }));
    const moves = args.objects('triage', { max: 50 }).map((move) => {
      const status = move.oneOf('status', TRIAGE_STATUSES);
      if (!status) throw new ToolError('Each triage item needs a status.');
      return { id: opportunityNumber(move.string('id', { required: true })!), status };
    });
    if (!additions.length && !moves.length) return 'Nothing to do: give "add" and/or "triage".';
    ctx.opportunities();

    const report: string[] = [];
    for (const offer of additions) {
      const result = await ctx.deps.opportunities.add(offer);
      const head = `${handleOf('opportunity', result.id)} ${clip(offer.title, 60)} @ ${clip(offer.company, 40)}`;
      report.push(result.duplicate ? `${head}: already queued, shortlisted` : parts(`${head}: queued as SHORTLISTED`, result.score === null ? 'not scored' : `score ${result.score}`));
    }
    const missing: string[] = [];
    for (const { id, status } of moves) {
      if (ctx.deps.opportunities.setStatus(id, status)) report.push(`${handleOf('opportunity', id)} → ${status}`);
      else missing.push(handleOf('opportunity', id));
    }
    return lines(...report, missing.length ? `Not in the queue: ${missing.join(', ')}` : '');
  },
};
