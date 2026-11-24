import type { InterviewQuestion } from '../../../shared/interviewQuestions.types';
import { ApplicationEventType, type Application } from '../../../shared/jobApplications.type';
import { questionKey } from '../../services/answers/AnswerBankManager';
import { foldText } from '../../utils/text';
import type { CallContext } from '../core/context';
import { clip, clipLong, lines, localDateTime, parts } from '../core/format';
import { handleOf, resolveHandle } from '../core/handles';
import { keywordScore, newNumbers, terms } from '../core/text';
import { ToolError, type ToolDef } from '../core/types';
import { profileItems } from './profileIndex';

const asked = (question: InterviewQuestion) =>
  question.applications.length ? ` (asked: ${question.applications.slice(0, 3).map((app) => handleOf('application', app.id)).join(', ')})` : '';

const questionLine = (question: InterviewQuestion, answerChars: number) =>
  `${handleOf('question', question.id)} ${clip(question.question, 160)}${asked(question)} → ${question.answer ? clip(question.answer, answerChars) : '(to prepare)'}`;

function questionDetail(question: InterviewQuestion): string {
  return lines(
    `${handleOf('question', question.id)} ${question.question}`,
    question.applications.length
      ? `  asked in: ${question.applications.map((app) => `${handleOf('application', app.id)} ${clip(app.job_title, 40)} @ ${clip(app.company_name, 30)} (${app.status})`).join(', ')}`
      : '',
    question.answer ? `  answer: ${clipLong(question.answer, 3000, 'the rest is in CV Maker')}` : '  no answer yet',
  );
}

/** "Node.js" is also written "NodeJS". */
const joinDotted = (text: string) => text.replace(/(\w)\.(\w)/g, '$1$2');

/** The library questions that best fit a text, best first. */
function related(questions: InterviewQuestion[], text: string, limit: number): InterviewQuestion[] {
  const queryTerms = terms(`${text} ${joinDotted(text)}`);
  return questions
    .map((question) => ({ question, score: keywordScore(queryTerms, `${question.question} ${question.answer} ${joinDotted(question.question)}`) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ question }) => question);
}

function nextInterview(ctx: CallContext, app: Application): string {
  const now = Date.now();
  const scheduled = (ctx.deps.applications.get(app.id)?.events ?? [])
    .filter((event) => event.event_type === ApplicationEventType.INTERVIEW_SCHEDULED && event.scheduled_at && new Date(event.scheduled_at).getTime() >= now)
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))[0];
  return scheduled ? parts(`Next interview ${localDateTime(scheduled.scheduled_at)}`, clip(scheduled.description, 120)) : '';
}

/** Form answers can hold contact details, codes or ids: those stay in the app. */
const PRIVATE_ANSWER = /@|\+?\d[\d\s().-]{7,}\d|https?:\/\//;
const PRIVATE_QUESTION = /code|password|mot de passe|\bssn\b|social (security|insurance)|passport|passeport|birth|naissance|phone|t[ée]l[ée]phone|e-?mail|courriel/i;
/** A file picked in an upload field, or a checkbox read back as its own label: says nothing. */
const isNoise = (question: string, answer: string) => /\.(pdf|docx?)$/i.test(answer.trim()) || foldText(answer.trim()) === foldText(question.trim());

function formAnswersSection(ctx: CallContext, search: string | undefined): string {
  const all = ctx.deps.interview.formAnswers();
  const shareable = all.filter((answer) => !PRIVATE_ANSWER.test(answer.answer) && !PRIVATE_QUESTION.test(answer.question) && !isNoise(answer.question, answer.answer));
  const shown = search ? shareable.filter((answer) => keywordScore(terms(search), `${answer.question} ${answer.answer}`) > 0) : shareable;
  if (!all.length) return 'No saved form answers.';
  return lines(
    `Saved form answers (${shown.length}${all.length > shareable.length ? `, ${all.length - shareable.length} private or empty left out` : ''}):`,
    ...shown.slice(0, 30).map((answer) => ` ${handleOf('answer', answer.id)} ${clip(answer.question, 120)} → ${clip(answer.answer, 160)}`),
  );
}

export const interviewPrep: ToolDef = {
  name: 'interview_prep',
  title: 'Read interview prep',
  description:
    "The user's interview questions library in CV Maker: questions recruiters asked or may ask, the answers the user prepared, and the interviews that asked them. " +
    'With application_id: the questions of that hiring process, the next interview and related library questions. ' +
    'ids reads full answers. form_answers adds what the user answered in application forms (salary expectation, notice period, work permit...).',
  inputSchema: {
    type: 'object',
    properties: {
      application_id: { type: 'string', description: 'Prepare for this application\'s interviews.' },
      search: { type: 'string', description: 'Words in the question or answer.' },
      unanswered: { type: 'boolean', description: 'Only questions without an answer yet.' },
      ids: { type: 'array', items: { type: 'string' }, maxItems: 20, description: 'Question handles to read in full.' },
      form_answers: { type: 'boolean', default: false },
      limit: { type: 'integer', minimum: 1, maximum: 60, default: 25 },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const ids = args.strings('ids', { max: 20 });
    const applicationId = args.string('application_id');
    const search = args.string('search', { max: 200 });
    const unanswered = args.boolean('unanswered') ?? false;
    const withFormAnswers = args.boolean('form_answers') ?? false;
    const limit = args.number('limit', { min: 1, max: 60, fallback: 25 });

    ctx.applications();
    const questions = ctx.deps.interview.list();
    const formAnswers = withFormAnswers ? formAnswersSection(ctx, search) : '';

    if (ids.length) {
      const found = ids.map((ref) => ({ ref, question: resolveHandle('question', ref, questions, (question) => question.id) }));
      const missing = found.filter(({ question }) => !question).map(({ ref }) => ref);
      return lines(
        ...found.filter(({ question }) => question).map(({ question }) => questionDetail(question!)),
        missing.length ? `Not in the library: ${missing.join(', ')}` : '',
        formAnswers,
      );
    }

    if (applicationId) {
      const app = ctx.application(applicationId);
      const own = questions.filter((question) => question.applications.some((linked) => linked.id === app.id));
      const others = related(questions.filter((question) => !own.includes(question)), `${app.job_title} ${(app.keywords ?? []).join(' ')}`, 8);
      return lines(
        parts(`${handleOf('application', app.id)} ${app.job_title} @ ${app.company_name}`, app.status),
        nextInterview(ctx, app),
        own.length ? `Asked in this process (${own.length}):` : 'No question logged for this process yet.',
        ...own.map((question) => ' ' + questionLine(question, 400)),
        others.length ? 'Library questions that may come up:' : '',
        ...others.map((question) => ' ' + questionLine(question, 160)),
        'Prepare answers from the profile (search_profile finds the stories), then save them with save_prep.',
        formAnswers,
      );
    }

    const answered = questions.filter((question) => question.answer).length;
    let shown = unanswered ? questions.filter((question) => !question.answer) : questions;
    if (search) shown = related(shown, search, shown.length);
    return lines(
      `${questions.length} interview questions, ${answered} answered, ${questions.length - answered} to prepare.`,
      search || unanswered ? `${shown.length} match:` : '',
      ...shown.slice(0, limit).map((question) => questionLine(question, 160)),
      shown.length > limit ? `… ${shown.length - limit} more (narrow with search)` : '',
      formAnswers,
    );
  },
};

export const savePrep: ToolDef = {
  name: 'save_prep',
  title: 'Save interview prep',
  description:
    "Adds questions and prepared answers to the user's interview library, or updates them, and links them to the applications whose interviews ask them. " +
    'A question already in the library (same wording) is reused: an empty answer is filled, the user\'s own answer is kept unless you give its id. ' +
    'Write answers in the user\'s voice from facts of the profile only, and ask before replacing an answer the user wrote.',
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 20,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Question handle, to update it.' },
            question: { type: 'string', description: 'As an interviewer would ask it.' },
            answer: { type: 'string', description: 'Prepared answer (replaces the current one when id is given).' },
            application_ids: { type: 'array', items: { type: 'string' }, description: 'Applications whose interviews ask it (added to the existing links).' },
          },
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  run: async (args, ctx) => {
    const items = args.objects('items', { max: 20 });
    if (!items.length) return 'Give at least one item.';
    const questions = ctx.deps.interview.list();
    const profileText = profileItems(await ctx.profile()).map((item) => item.text).join(' ');

    const report: string[] = [];
    const warnings: string[] = [];
    let changed = false;
    items.forEach((item, index) => {
      const label = `#${index + 1}`;
      try {
        const ref = item.string('id');
        const question = item.string('question', { max: 600 });
        const answer = item.string('answer', { max: 6000 });
        const applicationIds = item.strings('application_ids', { max: 20 }).map((handle) => ctx.application(handle).id);

        const existing = ref
          ? resolveHandle('question', ref, questions, (candidate) => candidate.id)
          : question ? questions.find((candidate) => questionKey(candidate.question) === questionKey(question)) : undefined;
        if (ref && !existing) throw new ToolError(`no question ${ref} in the library`);
        if (!existing && !question) throw new ToolError('give the question, or the id of one to update');

        const links = [...new Set([...(existing?.applications.map((app) => app.id) ?? []), ...applicationIds])];
        let saved: InterviewQuestion;
        let what: string;
        if (!existing) {
          saved = ctx.deps.interview.add({ question: question!, answer: answer ?? '', applicationIds: links });
          what = answer ? 'added with an answer' : 'added, to prepare';
        } else {
          const replaces = !!answer && (!!ref || !existing.answer);
          const keptUsers = !!answer && !replaces;
          saved = ctx.deps.interview.update(existing.id, {
            question: ref && question ? question : existing.question,
            answer: replaces ? answer! : existing.answer,
            applicationIds: links,
          });
          what = keptUsers
            ? 'already in the library with the user\'s answer, kept (give its id to replace it)'
            : replaces ? (existing.answer ? 'answer replaced' : 'answer added') : 'updated';
        }
        changed = true;
        const added = applicationIds.filter((id) => !existing?.applications.some((app) => app.id === id)).length;
        report.push(`${label} ${handleOf('question', saved.id)} ${clip(saved.question, 80)}: ${what}${added ? `, linked to ${added} more application${added > 1 ? 's' : ''}` : ''}`);
        const invented = saved.answer === answer ? newNumbers(answer, `${profileText} ${existing?.answer ?? ''}`) : [];
        if (invented.length) warnings.push(`${handleOf('question', saved.id)}: ${invented.join(', ')}`);
      } catch (error) {
        report.push(`${label} not saved: ${(error as Error).message}`);
      }
    });
    if (changed) ctx.deps.interview.announce();
    return lines(
      ...report,
      warnings.length ? `Figures not found in the profile, check them with the user: ${warnings.join('; ')}` : '',
    );
  },
};
