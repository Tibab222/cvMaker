import { APPLICATION_CHANNELS, JobApplicationStatus, PAST_APPLICATION_STATUSES, type Application, type ApplicationWithEvents, type CVSessionDataDTO, type Reminder } from '../../../shared/jobApplications.type';
import { foldText } from '../../utils/text';
import { titleWords } from '../../services/discovery/scoring';
import type { CallContext } from '../core/context';
import { clip, clipLong, day, lines, localDateTime, money, parts } from '../core/format';
import { handleOf } from '../core/handles';
import { ToolError, type ToolDef } from '../core/types';
import { profileItems } from './profileIndex';

const STATUSES = Object.values(JobApplicationStatus);
const CHANNEL_LABEL = new Map<string, string>(APPLICATION_CHANNELS.map(({ value, label }) => [value, label]));
const DETAIL_PARTS = ['offer', 'timeline', 'resume', 'questions', 'cover_letter'] as const;

// an archived draft was never sent
const isSent = (app: Application) => !!app.applied_at || PAST_APPLICATION_STATUSES.includes(app.status);
const activityDate = (app: Application) => app.applied_at ?? app.created_at;

function countBy<T>(items: T[], key: (item: T) => string): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(' · ');
}

function applicationLine(app: Application): string {
  return parts(
    `${handleOf('application', app.id)} ${app.job_title} @ ${app.company_name}`,
    app.status,
    app.applied_at ? `sent ${day(app.applied_at)}` : `created ${day(app.created_at)}`,
    app.channel ? CHANNEL_LABEL.get(app.channel) : '',
    money(app.salary),
    app.json_file_path ? 'tailored resume' : '',
  );
}

function sinceArg(value: string | undefined): string | undefined {
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ToolError('"since" must be a date written YYYY-MM-DD.');
  return value;
}

export const listApplications: ToolDef = {
  name: 'list_applications',
  title: 'List applications',
  description: "The user's job applications, one line each, most recent first, with status counts. Filter by status, company/title text or date.",
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'array', items: { type: 'string', enum: STATUSES }, description: 'Only these statuses.' },
      search: { type: 'string', description: 'Text in the company or job title.' },
      since: { type: 'string', description: 'Sent (or created) on or after this day, YYYY-MM-DD.' },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const statuses = args.oneOfList('status', STATUSES);
    const search = args.string('search', { max: 100 });
    const since = sinceArg(args.string('since'));
    const limit = args.number('limit', { min: 1, max: 100, fallback: 20 });
    const offset = args.number('offset', { min: 0, fallback: 0 });

    const all = ctx.applications();
    const matching = all
      .filter((app) => !statuses.length || statuses.includes(app.status))
      .filter((app) => !search || foldText(`${app.company_name} ${app.job_title}`).includes(foldText(search)))
      .filter((app) => !since || day(activityDate(app)) >= since)
      .sort((a, b) => activityDate(b).localeCompare(activityDate(a)));
    const page = matching.slice(offset, offset + limit);

    return lines(
      `${all.length} applications: ${countBy(all, (app) => app.status) || 'none yet'}`,
      matching.length !== all.length || offset > 0 ? `${matching.length} match, showing ${page.length ? `${offset + 1}-${offset + page.length}` : 'none'}:` : '',
      ...page.map(applicationLine),
      offset + page.length < matching.length ? `… ${matching.length - offset - page.length} more (offset ${offset + page.length})` : '',
    );
  },
};

function timeline(app: ApplicationWithEvents, max: number): string {
  const events = app.events.slice(0, max).map((event) => ' ' + parts(
    day(event.event_date),
    event.event_type,
    event.to_status ? `→ ${event.to_status}` : '',
    event.scheduled_at ? `on ${localDateTime(event.scheduled_at)}` : '',
    clip(event.description, 140),
  ));
  return lines(`Timeline (${Math.min(max, app.events.length)} of ${app.events.length}, newest first):`, ...events);
}

async function resumeSection(session: CVSessionDataDTO, ctx: CallContext): Promise<string> {
  const items = new Map(profileItems(await ctx.profile()).map((item) => [item.id, item]));
  const label = (id: string) => {
    const item = items.get(id);
    return item ? `${item.handle} ${clip(item.label, 50)}` : `${id} (no longer in the profile)`;
  };
  const { selection } = session;
  const bullets = Object.entries(selection.selectedBullets ?? {});
  const rewrites = Object.entries(session.customTexts ?? {}).map(([key, text]) => {
    const [type, id, field] = key.split(':');
    const owner = type === 'section' ? `section ${id}` : items.get(id)?.handle ?? id;
    return `  ${owner}.${field}: ${clip(text, 300)}`;
  });
  return lines(
    'Tailored resume:',
    selection.headerInfos?.title ? `  headline: ${selection.headerInfos.title}` : '',
    session.topResumeSummary?.length ? `  summary: ${session.topResumeSummary.map((bullet) => clip(bullet, 200)).join(' | ')}` : '',
    `  experiences: ${selection.selectedExpIds.map(label).join(', ') || 'none'}`,
    `  projects: ${selection.selectedProjectIds.map(label).join(', ') || 'none'}`,
    bullets.length ? `  bullets: ${bullets.map(([projectId, ids]) => `${items.get(projectId)?.handle ?? projectId}: ${ids.map((id) => items.get(id)?.handle ?? id).join(' ')}`).join('; ')}` : '',
    `  skills: ${selection.selectedSkillsIds.length} · education: ${selection.selectedEducationIds.map(label).join(', ') || 'none'}`,
    selection.templateId ? `  template: ${selection.templateId}` : '',
    rewrites.length ? `  rewritten texts (${rewrites.length}):` : '  no rewritten text',
    ...rewrites,
  );
}

export const getApplication: ToolDef = {
  name: 'get_application',
  title: 'Read an application',
  description:
    'One application: status, dates, channel, salary, keywords, recruiter, notes, latest timeline events. ' +
    'Ask for more with include: offer (job description), resume (tailored resume: selection and rewritten texts), questions (interview prep), cover_letter.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Application handle, e.g. "a1b2c3d".' },
      include: { type: 'array', items: { type: 'string', enum: DETAIL_PARTS }, description: 'Default: timeline.' },
      offer_chars: { type: 'integer', minimum: 500, maximum: 20000, default: 3000, description: 'Cut the job description after this many characters.' },
    },
    required: ['id'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const handle = args.string('id', { required: true });
    const include = new Set(args.has('include') ? args.oneOfList('include', DETAIL_PARTS) : ['timeline']);
    const offerChars = args.number('offer_chars', { min: 500, max: 20000, fallback: 3000 });

    const app = ctx.deps.applications.get(ctx.application(handle).id)!;
    const session = app.json_file_path ? ctx.deps.applications.session(app.id) : null;
    const offerText = session?.jobInfos?.description || app.description || '';
    const questions = include.has('questions') ? ctx.deps.applications.questions(app.id) : [];
    const letter = session?.coverLetter;

    return lines(
      parts(`${handleOf('application', app.id)} ${app.job_title} @ ${app.company_name}`, app.status),
      parts(`created ${day(app.created_at)}`, app.applied_at ? `sent ${day(app.applied_at)}` : 'not sent', app.channel ? CHANNEL_LABEL.get(app.channel) : '', money(app.salary), app.url),
      app.keywords.length ? `Keywords: ${app.keywords.join(', ')}` : '',
      session?.jobInfos?.focus ? `Focus: ${clip(session.jobInfos.focus, 300)}` : '',
      app.recruiter_contact ? `Recruiter: ${clip(app.recruiter_contact, 200)}` : '',
      app.notes ? `Notes: ${clipLong(app.notes, 1500, 'the rest is in the app')}` : '',
      include.has('timeline') ? timeline(app, 8) : '',
      include.has('offer') ? (offerText ? `Offer:\n${clipLong(offerText, offerChars, `get_application with a higher offer_chars`)}` : 'No offer text saved.') : '',
      include.has('resume') ? (session ? await resumeSection(session, ctx) : 'No tailored resume: added by hand or from the browser.') : '',
      include.has('questions') ? lines(
        `Interview questions (${questions.length}):`,
        ...questions.map((question) => `  ${handleOf('question', question.id)} ${clip(question.question, 160)} → ${question.answer ? clip(question.answer, 240) : '(no answer yet)'}`),
      ) : '',
      include.has('cover_letter') ? (letter?.blocks.length
        ? lines(`Cover letter (${letter.blocks.length} paragraphs):`, ...[...letter.blocks].sort((a, b) => a.position - b.position).map((block) => `  ${block.content}`))
        : 'No cover letter.') : '',
    );
  },
};

function reminderLine(reminder: Reminder): string {
  const when = reminder.kind === 'interview' ? `in ${reminder.days}d (${localDateTime(reminder.date)})` : `${reminder.days}d`;
  return ' ' + parts(reminder.kind, `${handleOf('application', reminder.application_id)} ${reminder.job_title} @ ${reminder.company_name}`, when, clip(reminder.detail, 80));
}

/** "LinkedIn 20 → 2 interviews, 6 rejected, 12 no answer" for each group of sent applications. */
function outcomes(groups: Map<string, Application[]>, interviewed: Set<string>, minSize: number, max: number): string[] {
  return [...groups.entries()]
    .filter(([, apps]) => apps.length >= minSize)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, max)
    .map(([name, apps]) => {
      const interviews = apps.filter((app) => interviewed.has(app.id)).length;
      const rejected = apps.filter((app) => !interviewed.has(app.id) && app.status === JobApplicationStatus.REJECTED).length;
      const silent = apps.filter((app) => !interviewed.has(app.id) && (app.status === JobApplicationStatus.APPLIED || app.status === JobApplicationStatus.NO_RESPONSE)).length;
      return ` ${name} ${apps.length} → ${interviews} interviews, ${rejected} rejected, ${silent} no answer`;
    });
}

function groupBy(apps: Application[], keys: (app: Application) => string[]): Map<string, Application[]> {
  const groups = new Map<string, Application[]>();
  for (const app of apps) for (const key of new Set(keys(app))) groups.set(key, [...(groups.get(key) ?? []), app]);
  return groups;
}

/** Keywords seen in 2+ of the offers: a single mention is mostly extraction noise. */
function topKeywords(apps: Application[], max: number): string {
  const counts = new Map<string, number>();
  for (const app of apps) for (const keyword of new Set(app.keywords.map((word) => word.toLowerCase()))) counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, max).map(([keyword, count]) => `${keyword} ${count}`).join(', ');
}

export const pipelineInsights: ToolDef = {
  name: 'pipeline_insights',
  title: 'Job search insights',
  description:
    'What works in the job search, computed locally: key rates, outcomes by channel and by job-title word, keywords of the offers that led to interviews, ' +
    'market keywords, and what needs action now (interviews coming, follow-ups due, silent applications).',
  inputSchema: {
    type: 'object',
    properties: { since: { type: 'string', description: 'Only applications sent on or after this day, YYYY-MM-DD (key rates stay all-time).' } },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const since = sinceArg(args.string('since'));
    const all = ctx.applications();
    const sent = all.filter(isSent).filter((app) => !since || day(activityDate(app)) >= since);
    const { applications: apps } = ctx.deps;
    const stats = apps.stats();
    const interviewed = apps.interviewedIds();
    const withInterview = sent.filter((app) => interviewed.has(app.id));
    const silent = apps.silent();
    const reminders = apps.reminders(10);
    const interviewKeywords = topKeywords(withInterview, 12);
    const otherKeywords = topKeywords(sent.filter((app) => !interviewed.has(app.id)), 12);

    return lines(
      `${all.length} applications (all time: ${countBy(all, (app) => app.status) || 'none'}), ${sent.length} sent${since ? ` since ${since}` : ''}.`,
      `All-time rates: ${stats.activeApplications} active · ${stats.applicationsLastWeek} sent last 7 days · interviews ${stats.interviewRate}% · offers ${stats.offerRate}% · ghosted ${stats.ghostingRate}% · first answer after ${stats.avgResponseTimeDays} days on average`,
      `Sent per week, last 8 weeks: ${stats.activitySpark.join(' ')}`,
      sent.length ? '\nBy channel:' : '',
      ...outcomes(groupBy(sent, (app) => [app.channel ? CHANNEL_LABEL.get(app.channel) ?? app.channel : 'Unknown']), interviewed, 1, 8),
      sent.length ? '\nBy job-title word (2+ applications):' : '',
      ...outcomes(groupBy(sent, (app) => titleWords(app.job_title)), interviewed, 2, 10),
      interviewKeywords ? `\nKeywords of offers that led to interviews: ${interviewKeywords}` : '',
      otherKeywords ? `Keywords of offers without interview: ${otherKeywords}` : '',
      `Market keywords (all offers analysed): ${ctx.deps.marketKeywords(15).map((stat) => `${stat.keyword} ${stat.global_count}`).join(', ') || 'none yet'}`,
      `\nTo do now:${reminders.length ? '' : ' nothing due'}`,
      ...reminders.map(reminderLine),
      silent.length ? ` ${silent.length} applications silent for 45+ days, could be closed as no response: ${silent.slice(0, 5).map((app) => `${handleOf('application', app.id)} ${app.company_name} ${app.days}d`).join(', ')}` : '',
    );
  },
};
