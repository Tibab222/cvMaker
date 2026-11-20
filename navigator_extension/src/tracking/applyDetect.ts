/**
 * Telling an application being sent from every other click: the "Apply" button of a posting only opens the form,
 * "Next" moves to the next step, a search or a login form is not an application. Pure DOM reading, never acts.
 */

/** Sends an application whatever the form around it ("Submit application", "Envoyer ma candidature"). */
const SEND_APPLICATION = /\b(submit|send|complete|finish|confirm)\s+(my\s+|your\s+|the\s+)?(job\s+)?application\b|\b(envoyer|soumettre|transmettre|valider|confirmer|finaliser)\s+(ma|la|votre|mon)\s+(candidature|dossier)\b/i;
/** Sends the form it belongs to ("Submit", "Envoyer"): an application only if that form is one. */
const SEND = /^\s*(submit|send|soumettre|envoyer|transmettre|valider|terminer|finish|done|apply|postuler|je postule|apply now|postuler maintenant|candidater|send application|submit now)\s*[!.]?\s*$/i;
/** Opens an application ("Apply", "Easy Apply", "Postuler"): the offer on screen is the one about to be sent. */
const START_APPLICATION = /\b(easy apply|candidature simplifi[ée]e|apply|postuler|postulez|candidater|je postule|i'?m interested|start (your |my )?application|commencer (ma|la) candidature)\b/i;
/**
 * The last button of a multi-step application (Workday's review page: "Submit"). Counts only once an application is
 * known to be in progress in this tab: the page itself has no fields left to tell. "Apply" is not one, it opens.
 */
const SUBMIT_FINAL = /^\s*(submit|send|complete|finish|confirm|submit now|soumettre|envoyer|transmettre|terminer|finaliser|confirmer|valider)\s*[!.]?\s*$/i;
/** A step of an application flow: "Next", "Save and Continue", or the way in ("Apply Manually", "Autofill with Resume"). */
const STEP = /\b(next|continue|suivant|continuer|save and continue|enregistrer et continuer)\b/i;
const FLOW_ENTRY = /\b(apply manually|autofill with (my )?resume|use my last application|postuler manuellement|remplir automatiquement|utiliser ma derni[èe]re candidature)\b/i;
/** Addresses of application flows: Workday (/apply/applyManually…), Lever (/apply), iCIMS, Taleo, SmartRecruiters… */
const FLOW_PATH = /\/apply(\/|$)|\/apply(manually|withresume)|applymanually|autofillwithresume|uselastapplication|\/application(s)?\/(form|apply|new|step)|\/candidature(s)?(\/|$)|\/postuler(\/|$)|\/careersection\/.*apply|\/oneclick-ui\//i;

/** The address is one of an application flow (the steps after "Apply"). */
export function isApplicationFlow(loc: { pathname: string; search?: string } = location): boolean {
  return FLOW_PATH.test(loc.pathname + (loc.search ?? ''));
}

/** Moves without sending, or another kind of form. */
const NOT_SENDING = /\b(next|continue|suivant|continuer|back|previous|pr[ée]c[ée]dent|retour|save|enregistrer|sauvegarder|draft|brouillon|search|rechercher|chercher|sign ?in|log ?in|connexion|se connecter|sign ?up|register|inscri|create (an )?account|cr[ée]er un compte|subscribe|abonner|newsletter|filters?|filtrer|upload|t[ée]l[ée]verser|attach|joindre|ajouter|add|cancel|annuler|review|r[ée]viser|v[ée]rifier|preview|aper[çc]u|edit|modifier|share|partager|alert|alerte)\b/i;
/** Text on the page once an application went through. */
const CONFIRMATION =
  /\b(thanks?( you)? for (applying|your application|your interest in|submitting)|you('ve| have) submitted( your application)?\b|application (has been |was |is )?(successfully )?(submitted|received|sent|complete[d]?)|we('ve| have) (successfully )?received your application|your application (has been|was|is) (successfully )?(submitted|sent|received|complete)|you('ve| have) (successfully )?applied|successfully (applied|submitted)|merci (pour|de) votre (candidature|int[ée]r[êe]t)|candidature (a (bien )?[ée]t[ée] |bien )?(envoy[ée]e|transmise|re[çc]ue|soumise|enregistr[ée]e)|nous avons (bien )?re[çc]u votre candidature|votre candidature (a|est) (bien )?([ée]t[ée] )?(envoy[ée]e|transmise|re[çc]ue|soumise|enregistr[ée]e))/i;
const ERROR_TEXT = /\b(required|invalid|obligatoire|requis|erreur|error|please (fill|enter|select|complete|provide|upload)|veuillez (remplir|saisir|s[ée]lectionner|indiquer|fournir))\b/i;
const RESUME_LABEL = /\b(resume|résumé|cv|curriculum)\b/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isVisible(element: Element): boolean {
  const html = element as HTMLElement;
  if (html.hidden) return false;
  const style = getComputedStyle(html);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return html.offsetWidth > 0 || html.offsetHeight > 0 || html.getClientRects().length > 0;
}

/** What a control says: its text, value, or label for icon buttons. */
export function controlText(control: Element): string {
  const html = control as HTMLElement & { value?: string };
  const raw = (control instanceof HTMLInputElement ? control.value : html.innerText || html.textContent) || control.getAttribute('aria-label') || html.title || '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, 80);
}

const CONTROL = 'button, input[type="submit"], input[type="button"], input[type="image"], [role="button"], a[href]';

export function controlOf(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(CONTROL) : null;
}

/** The form or dialog around a control: where to look for the fields it sends. */
export function scopeOf(control: Element): Element {
  const form = (control as HTMLButtonElement).form ?? control.closest('form');
  return form ?? control.closest('[role="dialog"], dialog, [aria-modal="true"]') ?? control.ownerDocument.body;
}

interface FormReading {
  filled: number;
  email: boolean;
  phone: boolean;
  file: boolean;
  resumeField: boolean;
  password: boolean;
}

function fieldLabel(field: Element): string {
  const id = field.getAttribute('id');
  const label = (id && field.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`)) || field.closest('label');
  return [label?.textContent, field.getAttribute('name'), field.getAttribute('aria-label'), field.getAttribute('placeholder')].filter(Boolean).join(' ');
}

export function readForm(scope: Element): FormReading {
  const reading: FormReading = { filled: 0, email: false, phone: false, file: false, resumeField: false, password: false };
  for (const field of Array.from(scope.querySelectorAll('input, textarea, select'))) {
    const input = field as HTMLInputElement;
    const type = (input.type || 'text').toLowerCase();
    if (['hidden', 'submit', 'button', 'image', 'reset', 'search'].includes(type) || input.disabled) continue;
    // file inputs are usually hidden behind a styled button: count them anyway
    if (type !== 'file' && !isVisible(field)) continue;
    if (type === 'password') reading.password = true;
    if (type === 'file') {
      if (RESUME_LABEL.test(fieldLabel(field))) reading.resumeField = true;
      if (input.files && input.files.length > 0) {
        reading.file = true;
        reading.filled++;
      }
      continue;
    }
    if (type === 'checkbox' || type === 'radio') continue;
    const value = field instanceof HTMLSelectElement ? (field.selectedIndex > 0 ? field.value : '') : input.value.trim();
    if (!value) continue;
    reading.filled++;
    if (type === 'email' || EMAIL.test(value)) reading.email = true;
    if (type === 'tel') reading.phone = true;
  }
  return reading;
}

/** Enough filled in, with contact details or a resume, and not a login: an application form. */
export function looksLikeApplicationForm(scope: Element): boolean {
  const form = readForm(scope);
  if (form.password) return false;
  return form.filled >= 2 && (form.email || form.phone || form.file || form.resumeField);
}

export type ClickMeaning = 'send' | 'start' | 'step' | null;

/**
 * What a click means for tracking: 'send' an application, 'start' one (the offer on screen is the one), move
 * through one ('step': an application is in progress in this tab), or nothing. A send needs a form that reads like
 * an application, except the explicit "Submit application" kind and, once an application is in progress, the plain
 * "Submit" of its last step (LinkedIn's and Workday's review pages show a summary, the fields are gone by then).
 * @param applying An application flow was entered in this tab (see isApplicationFlow and the 'step' clicks).
 */
export function clickMeaning(control: Element, applying = false): ClickMeaning {
  if ((control as HTMLButtonElement).disabled || control.getAttribute('aria-disabled') === 'true') return null;
  const label = controlText(control);
  if (!label || label.length > 60) return null;
  const scope = scopeOf(control);
  const form = readForm(scope);
  if (SEND_APPLICATION.test(label) && !form.password) return 'send';
  if (FLOW_ENTRY.test(label)) return 'step';
  if (NOT_SENDING.test(label)) {
    // "Next" on an application form (not a login, not a search): its last page may have no fields left
    return STEP.test(label) && !form.password && (applying || looksLikeApplicationForm(scope)) ? 'step' : null;
  }
  if (SEND.test(label) && looksLikeApplicationForm(scope)) return 'send';
  if (applying && SUBMIT_FINAL.test(label) && !form.password) return 'send';
  if (START_APPLICATION.test(label)) return 'start';
  return null;
}

/** A form sent with Enter or a button: its submit button says it does something else (Subscribe, Search, Next…). */
export function submitsSomethingElse(form: HTMLFormElement, submitter: Element | null): boolean {
  const button = submitter ?? form.querySelector('button[type=submit], button:not([type]), input[type=submit]');
  if (!button) return false;
  const label = controlText(button);
  return !!label && !SEND_APPLICATION.test(label) && NOT_SENDING.test(label);
}

/** Visible errors in the form after it was sent: it did not go through. */
export function hasVisibleErrors(scope: Element): boolean {
  if (!scope.isConnected || !isVisible(scope)) return false;
  const invalid = Array.from(scope.querySelectorAll('[aria-invalid="true"], input:invalid, textarea:invalid, select:invalid')).some((element) => isVisible(element));
  if (invalid) return true;
  return Array.from(scope.querySelectorAll('[role="alert"], [class*="error" i], [class*="invalid" i]')).some(
    (element) => isVisible(element) && ERROR_TEXT.test((element.textContent ?? '').slice(0, 300)),
  );
}

/** The page says the application went through: headings, alerts, dialogs and short blocks only (not FAQ text). */
export function confirmationText(doc: Document = document): string | null {
  if (CONFIRMATION.test(doc.title)) return doc.title;
  if (!doc.body) return null;
  // one pass over the text nodes (cheap, it runs on every page load); only the few with a telling word are looked at
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let scanned = 0;
  for (let node = walker.nextNode(); node && scanned < 20_000; node = walker.nextNode(), scanned++) {
    if (!/thank|merci|applied|application|candidature/i.test(node.nodeValue ?? '')) continue;
    // the sentence may be split over inline tags ("<b>Thank you</b> for applying"): read the block around it
    let block = node.parentElement;
    while (block && block.parentElement && /^(B|STRONG|EM|I|SPAN|A|SMALL|MARK)$/.test(block.tagName)) block = block.parentElement;
    if (!block || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TEXTAREA|OPTION)$/.test(block.tagName)) continue;
    const content = (block.textContent ?? '').replace(/\s+/g, ' ').trim();
    // a short block only: a page explaining "what happens once your application is submitted" is not a confirmation
    if (content.length < 12 || content.length > 220) continue;
    if (CONFIRMATION.test(content) && isVisible(block)) return content;
  }
  return null;
}

/** Title and headings of the page: forms often repeat the job ("Apply for DevOps Engineer"). */
export function pageHints(doc: Document = document): string[] {
  const headings = Array.from(doc.querySelectorAll('h1, h2'))
    .filter((heading) => isVisible(heading))
    .slice(0, 4)
    .map((heading) => (heading.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter((value) => value && value.length < 200);
  return [doc.title, ...headings].filter(Boolean);
}
