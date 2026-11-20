import type { AttentionReason, FieldKind } from '../core/messages';

/**
 * Recognizes what an application-form field asks for, from everything a human would read:
 * its label, placeholder, aria attributes, name/id and autocomplete hint. FR + EN.
 */

export type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export type Classification =
  | { type: 'fill'; kind: FieldKind }
  | { type: 'attention'; reason: AttentionReason }
  | { type: 'skip' };

const AUTOCOMPLETE_KINDS: Record<string, FieldKind> = {
  'given-name': 'firstName',
  'family-name': 'lastName',
  name: 'fullName',
  email: 'email',
  tel: 'phone',
  'tel-national': 'phone',
  url: 'portfolio',
  organization: 'currentCompany',
  'organization-title': 'currentTitle',
  'address-level2': 'location',
};

/** Order matters: "prénom et nom" is a full name before it is a first name. */
const RULES: [FieldKind, RegExp][] = [
  ['linkedin', /linked\s?in/],
  ['github', /git\s?hub/],
  ['email', /e-?mail|courriel/],
  ['phone', /phone|t[ée]l[ée]phone|mobile|portable|\btel\b/],
  ['fullName', /full name|your name|legal name|nom complet|nom et pr[ée]nom|pr[ée]nom et nom|^name\b|^candidate name/],
  ['firstName', /first name|given name|forename|pr[ée]nom/],
  ['lastName', /last name|family name|surname|nom de famille|^nom\b/],
  ['currentCompany', /current (company|employer)|entreprise actuelle|employeur actuel|^company$|^entreprise$/],
  ['currentTitle', /current (title|role|position|job)|poste actuel|fonction actuelle|^job title|^title$|^intitul[ée] du poste/],
  ['location', /\bcity\b|\bville\b|^location|current location|localisation|where are you (based|located)|lieu de r[ée]sidence/],
  ['portfolio', /portfolio|website|site (web|internet|perso)|personal (site|url|page)|other (link|url|website)/],
];

/**
 * Questions that commit the candidate (legal status, salary, identity...). Never answered automatically,
 * whatever the profile contains: the user decides.
 */
const SENSITIVE = new RegExp([
  'gender', 'sexe', '\\bgenre\\b', 'pronoun', '\\brace\\b', 'ethnic', 'origine', 'veteran', 'disab', 'handicap', 'religio', 'sexual orientation',
  'date of birth', 'birth ?date', 'naissance', '\\bage\\b', 'nationalit', 'citizenship', 'visa', 'sponsor', 'work (authori|permit)',
  'authori[sz]ed to work', 'right to work', 'autorisation de travail', 'permis de travail', 'salary', 'salaire', 'r[ée]mun[ée]ration',
  'pr[ée]tention', 'compensation', 'notice', 'pr[ée]avis', 'start date', 'disponibilit', 'criminal', 'convict', 'background check',
  'password', 'mot de passe', '\\bssn\\b', 'social security', 's[ée]curit[ée] sociale', 'consent', 'privacy', 'gdpr', 'rgpd',
].join('|'));

const IGNORED_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'password', 'search', 'range', 'color']);

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** "firstName" / "first_name" / "first-name" -> "first name" */
const humanize = (text: string) => text.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_\-[\].]+/g, ' ').toLowerCase();

function textOfIds(ids: string | null): string {
  if (!ids) return '';
  return ids.split(/\s+/).map((id) => clean(document.getElementById(id)?.textContent)).join(' ');
}

/** Text right before the field in its container: many ATS put the label in a sibling div, not a <label>. */
function nearbyText(element: Element): string {
  let node: Element | null = element;
  for (let depth = 0; depth < 3 && node; depth++) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      const text = clean(sibling.textContent);
      if (text && text.length <= 120 && !sibling.querySelector('input, textarea, select')) return text;
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
    const legend = node?.querySelector(':scope > legend');
    if (legend) return clean(legend.textContent);
  }
  return '';
}

/**
 * The question a field asks, in full, as the user reads it: its label, aria label, the text before it or its
 * placeholder. Empty when only the field's name or id says it (those are not questions).
 */
export function questionText(control: FormControl): string {
  const labels = 'labels' in control && control.labels ? Array.from(control.labels).map((label) => clean(label.textContent)).filter(Boolean) : [];
  const aria = clean(control.getAttribute('aria-label')) || textOfIds(control.getAttribute('aria-labelledby'));
  const placeholder = 'placeholder' in control ? clean(control.placeholder) : '';
  const text = labels[0] || aria || nearbyText(control) || placeholder;
  return text.replace(/\s*\*\s*$/, '').replace(/\s*\((required|obligatoire)\)\s*$/i, '').trim();
}

/** Text of an element and of what it points at, for a group of fields (radio buttons under one question). */
export function groupQuestionText(group: Element): string {
  const aria = clean(group.getAttribute('aria-label')) || textOfIds(group.getAttribute('aria-labelledby'));
  if (aria) return aria;
  const legend = group.querySelector(':scope > legend');
  if (legend) return clean(legend.textContent);
  return nearbyText(group);
}

/** What a human reads as the field's label (for the report), and everything that describes it (for matching). */
export function describe(control: FormControl): { label: string; haystack: string } {
  const labels = 'labels' in control && control.labels ? Array.from(control.labels).map((label) => clean(label.textContent)) : [];
  const aria = clean(control.getAttribute('aria-label')) || textOfIds(control.getAttribute('aria-labelledby'));
  const placeholder = 'placeholder' in control ? clean(control.placeholder) : '';
  const nearby = labels.length || aria ? '' : nearbyText(control);
  const label = (labels[0] || aria || nearby || placeholder || humanize(control.name || control.id || 'field')).replace(/\s*\*$/, '').slice(0, 80);

  const haystack = [
    ...labels,
    aria,
    nearby,
    placeholder,
    humanize(control.name || ''),
    humanize(control.id || ''),
  ].join(' | ').toLowerCase();

  return { label, haystack };
}

export function isVisible(element: HTMLElement): boolean {
  if (element.getClientRects().length === 0) return false;
  const style = getComputedStyle(element);
  if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  // honeypots are often 1px or pushed off-screen
  return rect.width > 2 && rect.height > 2 && rect.right > -100 && rect.bottom > -100;
}

export function isRequired(control: FormControl, label: string): boolean {
  return control.required || control.getAttribute('aria-required') === 'true' || /\*\s*$/.test(label);
}

function matchKind(haystack: string): FieldKind | null {
  // each piece of the haystack is tested on its own, so "^nom" anchors work on the label itself
  const pieces = haystack.split(' | ').filter(Boolean);
  for (const [kind, rule] of RULES) {
    if (pieces.some((piece) => rule.test(piece))) return kind;
  }
  return null;
}

export function classify(control: FormControl): Classification & { label: string } {
  const { label, haystack } = describe(control);
  const result = (classification: Classification) => ({ ...classification, label });

  if (control.disabled || ('readOnly' in control && control.readOnly)) return result({ type: 'skip' });
  if (control instanceof HTMLInputElement && IGNORED_INPUT_TYPES.has(control.type)) return result({ type: 'skip' });
  if (control instanceof HTMLInputElement && control.type === 'file') {
    return result({ type: 'attention', reason: 'file' });
  }
  if (!isVisible(control)) return result({ type: 'skip' });

  if (SENSITIVE.test(haystack)) return result({ type: 'attention', reason: 'sensitive' });

  const isChoice = control instanceof HTMLSelectElement
    || (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio'));
  if (isChoice) {
    return isRequired(control, label) ? result({ type: 'attention', reason: 'choice' }) : result({ type: 'skip' });
  }

  const autocomplete = (control.getAttribute('autocomplete') || '').toLowerCase().split(/\s+/).pop() ?? '';
  const kind = AUTOCOMPLETE_KINDS[autocomplete]
    ?? (control instanceof HTMLInputElement && control.type === 'email' ? 'email' : null)
    ?? (control instanceof HTMLInputElement && control.type === 'tel' ? 'phone' : null)
    ?? matchKind(haystack);

  if (kind && !(control instanceof HTMLTextAreaElement)) return result({ type: 'fill', kind });

  // a free-text question ("Why do you want to join us?") is for the candidate to write
  if (control instanceof HTMLTextAreaElement) return result({ type: 'attention', reason: 'question' });
  return isRequired(control, label) ? result({ type: 'attention', reason: 'required' }) : result({ type: 'skip' });
}
