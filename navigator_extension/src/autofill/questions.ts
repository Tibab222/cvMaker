import type { AnsweredField, AnswerKind, AnswerMatch, AnswerQuestion, CapturedAnswer } from '../core/messages';
import { classify, groupQuestionText, isVisible, questionText, type FormControl } from './detect';
import { ANSWERED_CLASS, ATTENTION_CLASS, FILLED_CLASS, setValue } from './fill';

/**
 * Answer bank, page side: reads the questions of an application form and the answers the user gave (to keep them),
 * and fills the empty ones with saved answers. Profile fields (name, email, phone...) are left to the profile, files
 * to the resume picker. Never submits anything.
 */

/**
 * Never kept nor filled: identity and self-identification, secrets, consents.
 * Same list as NEVER_KEPT_QUESTION in shared/answers.types.ts (the app checks again).
 */
const NEVER_KEPT = new RegExp([
  'gender', 'sexe', '\\bgenre\\b', 'pronoun', '\\brace\\b', 'ethnic', '[ée]thni', 'origine', 'indigenous', 'autochtone', 'aboriginal',
  'veteran', 'v[ée]t[ée]ran', 'disab', 'handicap', 'religio', 'sexual', 'orientation sexuelle', 'lgbt', 'minorit', 'visible minority',
  'date of birth', 'birth ?date', 'naissance', '\\bage\\b', '\\bssn\\b', 'social security', 's[ée]curit[ée] sociale', '\\bnas\\b', '\\bsin\\b',
  'social insurance', 'assurance sociale', 'password', 'mot de passe', 'passport', 'passeport', 'driver.?s licen', 'permis de conduire',
  'credit card', 'carte de cr[ée]dit', 'bank', 'banc', 'consent', 'privacy', 'gdpr', 'rgpd', 'terms', 'conditions', 'i agree', "j'accepte",
  'signature', 'sign here', 'captcha',
].join('|'), 'i');

/** "Select one", "-- Choose --": the empty choice of a list. */
const PLACEHOLDER_OPTION = /^\s*(select|choose|pick|please|s[ée]lectionne|choisi|veuillez|--|—|\.\.\.)/i;
const SKIPPED_TYPES = new Set(['hidden', 'password', 'file', 'submit', 'button', 'reset', 'image', 'search', 'range', 'color', 'checkbox', 'email', 'tel', 'url']);
/** Longer answers are letters written for one company ("Why do you want to join us?"): not reused. */
const MAX_KEPT_ANSWER = 500;
const MAX_QUESTION = 300;

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

interface Field {
  /** The control, or every radio button of the group. */
  controls: FormControl[];
  question: string;
  kind: AnswerKind;
  /** select / radio group */
  choice: 'select' | 'radio' | null;
  options: string[];
}

function radioLabel(radio: HTMLInputElement): string {
  const label = radio.labels?.[0] ? clean(radio.labels[0].textContent) : '';
  if (label) return label;
  const aria = clean(radio.getAttribute('aria-label'));
  if (aria) return aria;
  // <input type="radio"> Yes
  const next = radio.nextSibling;
  const after = next && next.nodeType === Node.TEXT_NODE ? clean(next.textContent) : next instanceof Element && !next.querySelector('input') ? clean(next.textContent) : '';
  return after || radio.value;
}

/** The smallest element around every radio of a group: its question is written above or in it. */
function radioGroup(radio: HTMLInputElement, all: HTMLInputElement[]): Element | null {
  const explicit = radio.closest('fieldset, [role="radiogroup"]');
  if (explicit && all.every((other) => explicit.contains(other))) return explicit;
  let node: Element | null = radio.parentElement;
  for (let depth = 0; depth < 6 && node; depth++) {
    if (all.every((other) => node!.contains(other))) {
      // the wrapper of the options; the question is the text before it or its first line
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function radioQuestion(group: Element, options: string[]): string {
  const outside = groupQuestionText(group);
  if (outside && !options.includes(outside)) return outside;
  // <div><p>Are you eligible?</p><label><input> Yes</label>...</div>
  for (const child of Array.from(group.children)) {
    if (child.querySelector('input')) continue;
    const text = clean(child.textContent);
    if (text && text.length <= MAX_QUESTION && !options.includes(text)) return text;
  }
  return '';
}

const isProfileField = (control: FormControl) => classify(control).type === 'fill';

/** The questions of a form (or part of one), with what each control offers. */
function readFields(scope: ParentNode): Field[] {
  const fields: Field[] = [];
  const groups = new Set<string>();
  const controls = Array.from(scope.querySelectorAll<FormControl>('input, textarea, select'));

  for (const control of controls) {
    if (control.disabled) continue;
    const doc = control.ownerDocument;
    if (control instanceof HTMLInputElement && control.type === 'radio') {
      if (!control.name || groups.has(control.name)) continue;
      groups.add(control.name);
      const all = Array.from(doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(control.name)}"]`)).filter((radio) => !radio.disabled);
      // custom radios hide the input: what counts is that the user sees the options
      if (!all.some((radio) => isVisible(radio) || (radio.labels?.[0] && isVisible(radio.labels[0])))) continue;
      const options = all.map(radioLabel);
      const group = radioGroup(control, all);
      const question = group ? radioQuestion(group, options) : '';
      if (question) fields.push({ controls: all, question: question.slice(0, MAX_QUESTION), kind: 'choice', choice: 'radio', options });
      continue;
    }
    if (control instanceof HTMLInputElement && SKIPPED_TYPES.has(control.type)) continue;
    if ('readOnly' in control && control.readOnly) continue;
    if (!isVisible(control) || isProfileField(control)) continue;
    const question = questionText(control).slice(0, MAX_QUESTION);
    if (!question) continue;
    if (control instanceof HTMLSelectElement) {
      const options = Array.from(control.options).map((option) => clean(option.textContent)).filter((text) => text && !PLACEHOLDER_OPTION.test(text));
      fields.push({ controls: [control], question, kind: 'choice', choice: 'select', options });
    } else {
      fields.push({ controls: [control], question, kind: 'text', choice: null, options: [] });
    }
  }
  return fields.filter((field) => field.question.length >= 3 && !NEVER_KEPT.test(field.question));
}

/** What the user gave: the typed text, the picked option, or nothing. */
function currentAnswer(field: Field): string {
  if (field.choice === 'radio') {
    const checked = field.controls.find((radio) => (radio as HTMLInputElement).checked) as HTMLInputElement | undefined;
    return checked ? radioLabel(checked) : '';
  }
  if (field.choice === 'select') {
    const option = (field.controls[0] as HTMLSelectElement).selectedOptions[0];
    const text = clean(option?.textContent);
    return option && option.value !== '' && text && !PLACEHOLDER_OPTION.test(text) ? text : '';
  }
  return clean((field.controls[0] as HTMLInputElement | HTMLTextAreaElement).value);
}

/** Answers the user gave in this form (or step), to keep in the answer bank. */
export function collectAnswers(scope: ParentNode, host = location.hostname): CapturedAnswer[] {
  const answers: CapturedAnswer[] = [];
  for (const field of readFields(scope)) {
    const answer = currentAnswer(field);
    if (!answer || answer.length > MAX_KEPT_ANSWER) continue;
    answers.push({ question: field.question, answer, kind: field.kind, ...(field.options.length ? { options: field.options } : {}), host });
  }
  return answers;
}

export interface OpenQuestions {
  questions: AnswerQuestion[];
  fields: Map<string, Field>;
}

/** The questions of the page still unanswered, for the answer bank to look up. */
export function openQuestions(doc: Document): OpenQuestions {
  const fields = new Map<string, Field>();
  const questions: AnswerQuestion[] = [];
  readFields(doc).forEach((field, index) => {
    if (currentAnswer(field)) return;
    const ref = String(index);
    fields.set(ref, field);
    questions.push({ ref, question: field.question, kind: field.kind, ...(field.options.length ? { options: field.options } : {}) });
  });
  return { questions, fields };
}

function mark(field: Field): void {
  const shown = field.choice === 'radio'
    ? field.controls[0].closest('fieldset, [role="radiogroup"]') ?? field.controls[0].parentElement?.parentElement ?? field.controls[0]
    : field.controls[0];
  field.controls.forEach((control) => control.classList.remove(ATTENTION_CLASS));
  shown.classList.remove(ATTENTION_CLASS);
  shown.classList.add(FILLED_CLASS, ANSWERED_CLASS);
}

/** Fills the questions the bank had an answer for; returns what was filled. */
export function applyAnswers(open: OpenQuestions, matches: AnswerMatch[]): { answered: AnsweredField[]; controls: FormControl[] } {
  const answered: AnsweredField[] = [];
  const controls: FormControl[] = [];
  for (const match of matches) {
    const field = open.fields.get(match.ref);
    if (!field || currentAnswer(field)) continue;
    let done = false;
    if (field.choice === 'radio') {
      const radio = field.controls.find((control) => radioLabel(control as HTMLInputElement) === match.answer) as HTMLInputElement | undefined;
      if (radio) {
        // a click, as the user would: frameworks listen to it
        radio.click();
        done = radio.checked;
      }
    } else if (field.choice === 'select') {
      const select = field.controls[0] as HTMLSelectElement;
      const option = Array.from(select.options).find((candidate) => clean(candidate.textContent) === match.answer);
      if (option) {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        if (setter) setter.call(select, option.value);
        else select.value = option.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        done = select.value === option.value;
      }
    } else {
      setValue(field.controls[0] as HTMLInputElement | HTMLTextAreaElement, match.answer);
      done = true;
    }
    if (!done) continue;
    mark(field);
    controls.push(...field.controls);
    answered.push({ label: field.question.slice(0, 80), value: match.answer, savedQuestion: match.savedQuestion, score: match.score });
  }
  return { answered, controls };
}
