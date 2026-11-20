import type { VaultFile } from '../core/messages';
import { describe } from './detect';
import { FILLED_CLASS } from './fill';

/**
 * Puts a resume PDF in the resume/CV field of an application form, the way a user picking the file would:
 * the field's file list is set, then input/change events let the page (React dropzones included) see it.
 * Never submits anything.
 */

const RESUME = /r[ée]sum[ée]|\bcv\b|curriculum|lebenslauf|\bvitae\b/i;
/** File fields for something else: the resume never goes there, even when it is the only field. */
const OTHER = /cover|lettre|motivation|transcript|relev[ée]|photo|picture|avatar|image|headshot|dipl[oô]m|certificat|id card|identit|passport|passeport|portfolio sample|writing sample/i;

/** Words of an upload button, not of what the field is for. */
const GENERIC_LABEL = /^(attach|upload|browse|choose|select|add|drop|drag|file|joindre|parcourir|t[ée]l[ée]verser|t[ée]l[ée]charger|ajouter|choisir|d[ée]poser|fichier)\b/i;

/**
 * What the field is for, as the user reads it. ATS often hide the input next to an "Attach" button,
 * under a heading in a wrapper ("Resume/CV" > [Attach] [Dropbox]): then the heading is the label.
 */
function fieldLabel(input: HTMLInputElement): string {
  const label = describe(input).label;
  if (label && !GENERIC_LABEL.test(label)) return label;
  let node: Element | null = input.parentElement;
  for (let depth = 0; depth < 4 && node; depth++) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      const text = (sibling.textContent ?? '').replace(/\s+/g, ' ').trim().replace(/\s*\*$/, '');
      if (text && text.length <= 80 && !sibling.querySelector('input, textarea, select') && !GENERIC_LABEL.test(text)) return text;
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
  }
  return label;
}

/** Text around the field: ATS often hide the input and label a wrapper ("Resume/CV" above an "Attach" button). */
function context(input: HTMLInputElement, label: string): string {
  const { haystack } = describe(input);
  let wrapper: HTMLElement | null = input.parentElement;
  let text = '';
  for (let depth = 0; depth < 3 && wrapper && text.length < 200; depth++) {
    text = (wrapper.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
    wrapper = wrapper.parentElement;
  }
  const accept = input.getAttribute('accept') ?? '';
  return [label, haystack, text, input.name, input.id, accept].join(' | ');
}

/** True when the field takes a PDF (no accept attribute means anything). */
function acceptsPdf(input: HTMLInputElement): boolean {
  const accept = (input.getAttribute('accept') ?? '').toLowerCase().trim();
  if (!accept) return true;
  return accept.split(',').map((part) => part.trim()).some((part) => part === '.pdf' || part === 'application/pdf' || part === '*/*' || part === 'application/*');
}

export interface ResumeField {
  input: HTMLInputElement;
  label: string;
}

/** The field the resume belongs to: one that says so, else the only file field that is not for something else. */
export function findResumeField(doc: Document): { field: ResumeField | null; fileFields: number } {
  const inputs = Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="file"]')).filter((input) => !input.disabled && acceptsPdf(input));
  const described = inputs.map((input) => {
    const label = fieldLabel(input);
    return { input, label, text: context(input, label) };
  });
  // the field's own label decides ("Cover letter" next to a "Resume" heading is still the cover letter)
  const named = described.find(({ label, text }) => RESUME.test(text) && !OTHER.test(label));
  const fallback = described.filter(({ text }) => !OTHER.test(text));
  const pick = named ?? (fallback.length === 1 ? fallback[0] : null);
  return { field: pick ? { input: pick.input, label: pick.label } : null, fileFields: inputs.length };
}

function toFile(file: VaultFile): File {
  const binary = atob(file.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], file.fileName, { type: file.mime || 'application/pdf', lastModified: Date.now() });
}

/** Attaches the resume; returns the label of the field it went in, or null when no field fits. */
export function attachResume(doc: Document, file: VaultFile): { attached: string | null; fileFields: number } {
  const { field, fileFields } = findResumeField(doc);
  if (!field) return { attached: null, fileFields };

  const transfer = new DataTransfer();
  transfer.items.add(toFile(file));
  field.input.files = transfer.files;
  field.input.dispatchEvent(new Event('input', { bubbles: true }));
  field.input.dispatchEvent(new Event('change', { bubbles: true }));
  if (!field.input.files || field.input.files.length === 0) return { attached: null, fileFields };

  // the input itself is often hidden: mark what the user sees
  const visible = field.input.getClientRects().length > 0 ? field.input : field.input.closest<HTMLElement>('label, div, fieldset');
  visible?.classList.add(FILLED_CLASS);
  return { attached: field.label, fileFields };
}
