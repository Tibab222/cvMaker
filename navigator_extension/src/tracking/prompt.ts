/**
 * "Did you just apply?" card, in a corner of the page. Lives in a closed shadow root: the site's styles cannot
 * reach it and it cannot touch the site. Nothing is saved until the user says yes.
 */
import type { ApplyAnswerResponse, ApplyPrompt } from '../core/messages';

export type Answer = (answer: 'yes' | 'no' | 'later', edits: { title?: string; company?: string; candidate?: number }) => Promise<ApplyAnswerResponse>;

const CSS = `
:host { all: initial; }
.card {
  --brand: #5b5bd6; --brand-strong: #4848c4; --brand-soft: rgba(91,91,214,.12);
  --surface: #fff; --surface-2: #f8f9fc; --border: #e3e5ee; --text: #171923; --muted: #6b7083;
  --ok: #0f9f6e; --ok-soft: rgba(16,185,129,.12); --warn: #b7791f; --warn-soft: rgba(245,158,11,.14); --danger: #d13a5b;
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; width: 340px; max-width: calc(100vw - 32px);
  box-sizing: border-box; padding: 14px; border-radius: 14px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text);
  font: 13px/1.45 "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased;
  box-shadow: 0 12px 32px rgba(16,24,40,.16), 0 2px 6px rgba(16,24,40,.06);
  animation: in .32s cubic-bezier(.22,1,.36,1);
}
@media (prefers-color-scheme: dark) {
  .card { --brand: #7c7cf0; --brand-strong: #9393f5; --brand-soft: rgba(124,124,240,.16); --surface: #171a23; --surface-2: #1c202b;
    --border: #2a2f3d; --text: #eceef5; --muted: #9a9fb3; --ok: #34d399; --ok-soft: rgba(52,211,153,.14); --warn: #fbbf24; --warn-soft: rgba(251,191,36,.14);
    box-shadow: 0 12px 32px rgba(0,0,0,.5); }
}
.card.out { animation: out .2s ease-in forwards; }
@keyframes in { from { opacity: 0; transform: translateY(10px) scale(.98); } }
@keyframes out { to { opacity: 0; transform: translateY(8px) scale(.98); } }
@media (prefers-reduced-motion: reduce) { .card, .card.out { animation: none; } }
* { box-sizing: border-box; }
header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.logo { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
  background: linear-gradient(135deg, var(--brand), #8b5cf6); color: #fff; font-weight: 700; font-size: 11px; letter-spacing: .02em; }
.head { flex: 1; min-width: 0; }
.head strong { display: block; font-size: 14px; font-weight: 600; }
.head span { display: block; color: var(--muted); font-size: 12px; }
.badge { display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; padding: 1px 7px; border-radius: 99px; font-size: 11px; font-weight: 500; }
.badge.ok { background: var(--ok-soft); color: var(--ok); }
.x { flex: none; border: 0; background: none; color: var(--muted); cursor: pointer; padding: 4px; margin: -4px -4px 0 0; border-radius: 6px; font: inherit; font-size: 16px; line-height: 1; }
.x:hover { background: var(--surface-2); color: var(--text); }
label { display: block; margin-bottom: 8px; }
label span { display: block; margin-bottom: 3px; color: var(--muted); font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; }
input { width: 100%; padding: 7px 9px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text); font: inherit; font-size: 13px; }
input:focus { outline: 2px solid var(--brand-soft); border-color: var(--brand); background: var(--surface); }
.src { margin: 2px 0 10px; color: var(--muted); font-size: 12px; }
.hint { margin: -2px 0 6px; color: var(--muted); font-size: 11.5px; }
.hint b { color: var(--text); font-weight: 600; }
input { padding-right: 28px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239a9aa8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20h9'/%3E%3Cpath d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 9px center; }
.src.warn { color: var(--warn); }
details { margin: -4px 0 10px; }
summary { cursor: pointer; color: var(--brand); font-size: 12px; font-weight: 500; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary:focus-visible { outline: 2px solid var(--brand-soft); border-radius: 4px; }
ul { list-style: none; margin: 6px 0 0; padding: 0; max-height: 168px; overflow: auto; }
li button { display: block; width: 100%; text-align: left; padding: 6px 8px; margin-bottom: 4px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--surface); color: var(--text); font: inherit; font-size: 12px; cursor: pointer; }
li button:hover, li button[aria-pressed="true"] { border-color: var(--brand); background: var(--brand-soft); }
li small { display: block; color: var(--muted); }
.actions { display: flex; gap: 8px; }
.btn { flex: 1; padding: 8px 10px; border-radius: 9px; border: 1px solid var(--border); background: var(--surface); color: var(--text);
  font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; transition: background .15s, transform .1s; }
.btn:hover { background: var(--surface-2); }
.btn:active { transform: scale(.98); }
.btn.primary { flex: 1.6; border-color: transparent; background: var(--brand); color: #fff; }
.btn.primary:hover { background: var(--brand-strong); }
.btn:disabled { opacity: .6; cursor: default; }
.btn:focus-visible, .x:focus-visible, li button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.msg { margin: 8px 0 0; font-size: 12px; min-height: 0; }
.msg.error { color: var(--danger); }
.done { display: flex; align-items: center; gap: 10px; }
.done .check { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--ok-soft); color: var(--ok); }
.done .check.muted { background: var(--surface-2); color: var(--muted); }
svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
`;

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>';
const CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>';

function sourceLine(prompt: ApplyPrompt): { text: string; warn: boolean } {
  const withText = prompt.hasDescription ? ', with its description' : '';
  switch (prompt.by) {
    case 'this-tab':
      return { text: `Read on ${prompt.offerHost || 'this page'}${withText}.`, warn: false };
    case 'opener':
      return { text: `From the posting you opened on ${prompt.offerHost || 'the previous tab'}${withText}.`, warn: prompt.confidence !== 'high' };
    case 'referrer':
      return { text: `From the page that led here (${prompt.offerHost})${withText}.`, warn: false };
    case 'company-site':
      return { text: `This site belongs to ${prompt.company}: the offer you viewed there. Check it.`, warn: true };
    case 'app':
      return { text: `The offer you opened from CV Maker${prompt.offerHost ? ` (${prompt.offerHost})` : ''}. Check it.`, warn: true };
    case 'guess':
      return { text: 'Best guess among the offers you viewed: check it.', warn: true };
    default:
      return { text: 'No posting seen before this form. Type it, or pick one below.', warn: true };
  }
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {}, children: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

let current: { host: HTMLElement; card: HTMLElement; promptId: string; busy: boolean; done: boolean } | null = null;

export function hidePrompt(promptId?: string): void {
  // answered from this card: the background hides it before our answer comes back, keep it for the result view
  if (!current || (promptId && current.promptId !== promptId) || current.done || current.busy) return;
  remove();
}

function remove(): void {
  const leaving = current;
  current = null;
  if (!leaving) return;
  leaving.card.classList.add('out');
  setTimeout(() => leaving.host.remove(), 200);
}

export function showPrompt(prompt: ApplyPrompt, answer: Answer): void {
  if (current?.promptId === prompt.id && !current.done) return;
  current?.host.remove();
  const host = document.createElement('cvmaker-apply-prompt');
  const root = host.attachShadow({ mode: 'closed' });
  const card = element('div', { className: 'card' });
  current = { host, card, promptId: prompt.id, busy: false, done: false };
  const state = current;

  const style = element('style', { textContent: CSS });
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'CVMaker: did you just apply?');

  const known = !!(prompt.title || prompt.company);
  const heading = element('strong', { textContent: known ? 'Did you just apply?' : 'Did you just apply for a job?' });
  const sub = element('span', { textContent: prompt.confirmed ? '' : 'A form was just sent on this page.' });
  if (prompt.confirmed) sub.append(element('span', { className: 'badge ok', innerHTML: `${CHECK} The site confirms it was sent` }));
  const close = element('button', { className: 'x', type: 'button', title: 'Not now (it stays in the CVMaker panel)', textContent: '×' });
  close.setAttribute('aria-label', 'Not now');
  const header = element('header', {}, [element('div', { className: 'logo', textContent: 'CV' }), element('div', { className: 'head' }, [heading, sub]), close]);

  const title = element('input', { value: prompt.title, placeholder: 'Position', autocomplete: 'off', spellcheck: false });
  const company = element('input', { value: prompt.company, placeholder: 'Company', autocomplete: 'off', spellcheck: false });
  const fields = element('div', {}, [element('label', {}, [element('span', { textContent: 'Position' }), title]), element('label', {}, [element('span', { textContent: 'Company' }), company])]);

  const source = sourceLine(prompt);
  const src = element('p', { className: `src${source.warn ? ' warn' : ''}`, textContent: source.text });

  let candidate: number | undefined;
  const others = prompt.candidates.filter((c) => !(c.index === 0 && known));
  const choices = element('details');
  if (others.length) {
    const list = element('ul');
    for (const option of others) {
      const button = element('button', { type: 'button' }, [option.title || 'Untitled offer', element('small', { textContent: [option.company, option.host].filter(Boolean).join(' · ') })]);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        candidate = option.index;
        title.value = option.title;
        company.value = option.company;
        list.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      });
      list.append(element('li', {}, [button]));
    }
    choices.append(element('summary', { textContent: known ? 'Another offer you viewed?' : `Pick one of the ${others.length} offers you viewed` }), list);
    choices.open = !known;
  }

  const no = element('button', { className: 'btn', type: 'button', textContent: 'No' });
  const yes = element('button', { className: 'btn primary', type: 'button', textContent: 'Yes, save it' });
  const msg = element('p', { className: 'msg' });
  msg.setAttribute('role', 'status');
  // what was read may be wrong (a job board's name as the company…): it is fixed here, before saving
  const hint = element('p', { className: 'hint', innerHTML: known ? 'Not right? <b>Edit the position or company</b> before saving.' : 'Type the position and company, or pick an offer below.' });
  const body = element('div', {}, [fields, hint, src, ...(others.length ? [choices] : []), element('div', { className: 'actions' }, [no, yes]), msg]);
  card.append(header, body);
  root.append(style, card);
  // no focus stealing: the user may be typing elsewhere; the card is reachable by Tab and announced as a dialog
  document.documentElement.append(host);

  const finish = (icon: string, text: string, tone: 'ok' | 'muted') => {
    state.done = true;
    body.replaceChildren(element('div', { className: 'done' }, [element('span', { className: `check${tone === 'muted' ? ' muted' : ''}`, innerHTML: icon }), element('div', { textContent: text })]));
    header.querySelector('.head span')?.remove();
    heading.textContent = tone === 'ok' ? 'Application tracked' : 'Not saved';
    setTimeout(() => current === state && remove(), 4000);
  };

  const run = async (kind: 'yes' | 'no' | 'later') => {
    if (state.busy) return;
    state.busy = true;
    yes.disabled = no.disabled = true;
    msg.className = 'msg';
    msg.textContent = kind === 'yes' ? 'Saving…' : '';
    try {
      const response = await answer(kind, kind === 'yes' ? { title: title.value, company: company.value, candidate } : {});
      if (!response.ok) {
        msg.className = 'msg error';
        msg.textContent = response.message;
        return;
      }
      if (kind === 'later') remove();
      else if (kind === 'no') finish(CHECK, 'Fine, nothing was added.', 'muted');
      else finish(response.state === 'queued' ? CLOCK : CHECK, response.message, 'ok');
    } catch {
      msg.className = 'msg error';
      msg.textContent = 'The extension did not answer. Try again from the CVMaker panel.';
    } finally {
      state.busy = false;
      yes.disabled = no.disabled = false;
    }
  };
  yes.addEventListener('click', () => void run('yes'));
  no.addEventListener('click', () => void run('no'));
  close.addEventListener('click', () => void run('later'));
  for (const input of [title, company]) input.addEventListener('keydown', (event) => {
    // keys typed here are for the card, not for the site's shortcuts
    event.stopPropagation();
    if (event.key === 'Enter') void run('yes');
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') void run('later');
  });
}
