import { ApplicationChannel, ApplicationEventType, JobApplicationStatus, PAST_APPLICATION_STATUSES, type Application } from '../../../shared/jobApplications.type';
import type { CallContext } from '../core/context';
import { day, lines, parts } from '../core/format';
import { handleOf } from '../core/handles';
import { ToolError, type ToolDef } from '../core/types';

const STATUSES = Object.values(JobApplicationStatus);
const CHANNELS = Object.values(ApplicationChannel);

const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function announce(ctx: CallContext, app: Application, action: 'created' | 'promoted' | 'updated', fromOffer = false): void {
  ctx.deps.applications.announce({ source: 'claude', action, title: app.job_title, company: app.company_name, fromOffer });
}

export const updateApplication: ToolDef = {
  name: 'update_application',
  permissions: ['applications_write'],
  title: 'Update an application',
  description:
    'Logs what happened on an application, as the user would in the app: a new status, a scheduled interview, a follow-up sent, a note, ' +
    'the recruiter contact, or text appended to its "Notes & Prep". Give only the fields that change. Ask the user before logging what they did not say.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Application handle.' },
      status: { type: 'string', enum: STATUSES },
      note: { type: 'string', description: 'Timeline note; with status, it explains the change.' },
      interview_at: { type: 'string', description: 'Interview date and time, ISO 8601 (e.g. 2026-11-28T14:00). Moves the application to INTERVIEW.' },
      interview_note: { type: 'string', description: 'Who, format, round...' },
      follow_up: { type: 'string', description: 'A follow-up the user sent: how and to whom.' },
      recruiter_contact: { type: 'string', description: 'Replaces the recruiter contact.' },
      append_notes: { type: 'string', description: 'Added at the end of "Notes & Prep", dated.' },
    },
    required: ['id'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  run: async (args, ctx) => {
    const app = ctx.application(args.string('id', { required: true }));
    const status = args.oneOf('status', STATUSES);
    const note = args.string('note', { max: 2000 });
    const interviewAt = args.string('interview_at');
    const interviewNote = args.string('interview_note', { max: 1000 });
    const followUp = args.string('follow_up', { max: 1000 });
    const recruiter = args.string('recruiter_contact', { max: 500 });
    const appendNotes = args.string('append_notes', { max: 5000 });
    if (!status && !note && !interviewAt && !followUp && !recruiter && !appendNotes) throw new ToolError('Nothing to change: give at least one field.');

    const { applications } = ctx.deps;
    const done: string[] = [];
    if (interviewAt) {
      const date = new Date(interviewAt);
      if (Number.isNaN(date.getTime())) throw new ToolError('"interview_at" must be an ISO date, e.g. 2026-11-28T14:00.');
      applications.addEvent(app.id, { event_type: ApplicationEventType.INTERVIEW_SCHEDULED, description: interviewNote, scheduled_at: date.toISOString() });
      done.push(`interview on ${interviewAt.replace('T', ' ')} logged`);
    }
    if (status) {
      applications.setStatus(app.id, status, note);
      done.push(`status ${status}${note ? ' with its note' : ''}`);
    } else if (note) {
      applications.addEvent(app.id, { event_type: ApplicationEventType.NOTE_ADDED, description: note });
      done.push('note logged');
    }
    if (followUp) {
      applications.addEvent(app.id, { event_type: ApplicationEventType.FOLLOW_UP, description: followUp });
      done.push('follow-up logged');
    }
    if (recruiter || appendNotes) {
      const notes = appendNotes ? `${app.notes?.trim() ? `${app.notes.trim()}\n\n` : ''}[${localToday()}] ${appendNotes}` : undefined;
      applications.updateDetails(app.id, { recruiter_contact: recruiter, notes });
      if (recruiter) done.push('recruiter contact saved');
      if (appendNotes) done.push('notes appended');
    }

    const updated = applications.get(app.id)!;
    announce(ctx, updated, 'updated');
    return `${handleOf('application', app.id)} ${app.job_title} @ ${app.company_name}: ${done.join(', ')}. Status now ${updated.status}.`;
  },
};

export const recordApplication: ToolDef = {
  name: 'record_application',
  permissions: ['applications_write'],
  title: 'Record an application sent elsewhere',
  description:
    'Adds to the pipeline an application the user sent outside CV Maker (company site, email, referral...). ' +
    'A resume already prepared for the same offer moves to Applied instead, and a recent duplicate is left as is. Only for applications the user says they sent.',
  inputSchema: {
    type: 'object',
    properties: {
      company: { type: 'string' },
      title: { type: 'string', description: 'Job title.' },
      applied_on: { type: 'string', description: 'Day it was sent, YYYY-MM-DD (default today).' },
      channel: { type: 'string', enum: CHANNELS },
      url: { type: 'string', description: 'Link to the offer.' },
      description: { type: 'string', description: 'Offer text, if the user gave it: its keywords feed the stats.' },
      salary: { type: 'string', description: 'Yearly amount, e.g. "85k".' },
      status: { type: 'string', enum: PAST_APPLICATION_STATUSES, description: 'Where it stands now, if already past Applied (e.g. REJECTED).' },
    },
    required: ['company', 'title'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  run: async (args, ctx) => {
    ctx.applications();
    const appliedOn = args.string('applied_on') ?? localToday();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appliedOn)) throw new ToolError('"applied_on" must be a day written YYYY-MM-DD.');
    if (appliedOn > localToday()) throw new ToolError('"applied_on" cannot be in the future.');
    const status = args.oneOf('status', PAST_APPLICATION_STATUSES);

    const company = args.string('company', { required: true, max: 200 });
    const title = args.string('title', { required: true, max: 200 });
    const channel = args.oneOf('channel', CHANNELS) ?? null;
    const url = args.string('url', { max: 2000 });
    const description = args.string('description', { max: 50_000 });

    const { applications } = ctx.deps;
    let summary: string;
    let app: Application;
    let offerId: number | null;
    if (status && status !== JobApplicationStatus.APPLIED) {
      ({ application: app, offerId } = await applications.recordPast({ company, title, appliedOn, status, channel, url, description }));
      summary = 'Recorded';
      announce(ctx, app, 'created', offerId !== null);
    } else {
      const result = await applications.record({ company, title, appliedOn, channel, url, description, salary: args.string('salary', { max: 50 }) });
      app = result.application;
      offerId = result.offer?.id ?? null;
      summary = {
        created: 'Recorded',
        promoted: 'The resume prepared for this offer moved to Applied',
        duplicate: 'Already in the pipeline, not added again',
      }[result.action];
      if (result.action !== 'duplicate') announce(ctx, app, result.action, offerId !== null);
    }

    return lines(
      `${summary}: ${parts(`${handleOf('application', app.id)} ${app.job_title} @ ${app.company_name}`, app.status, app.applied_at ? `sent ${day(app.applied_at)}` : '')}`,
      offerId !== null ? `Linked to opportunity ${handleOf('opportunity', offerId)}, which left the queue.` : '',
    );
  },
};
