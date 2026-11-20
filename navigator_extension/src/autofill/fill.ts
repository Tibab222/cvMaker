import type { AttentionField, AutofillProfile, AutofillReport, FilledField } from '../core/messages';
import { classify, type FormControl } from './detect';

export const FILLED_CLASS = 'cvmaker-filled';
export const ATTENTION_CLASS = 'cvmaker-attention';
/** Filled from the answer bank (on top of FILLED_CLASS). */
export const ANSWERED_CLASS = 'cvmaker-answered';

/**
 * Sets a value the way a framework-controlled input expects: through the native setter, then input/change events,
 * so React / Vue / Angular forms register it. Never submits anything.
 */
export function setValue(control: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  control.focus({ preventScroll: true });
  if (setter) setter.call(control, value);
  else control.value = value;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
  control.blur();
}

/** Radio groups are reported once, not once per option. */
function groupKey(control: FormControl): string | null {
  return control instanceof HTMLInputElement && control.type === 'radio' && control.name ? `radio:${control.name}` : null;
}

/** The report, and the fields left to the user (same order as report.attention): saved answers may take some. */
export function autofillDocument(doc: Document, profile: AutofillProfile): AutofillReport & { attentionControls: FormControl[] } {
  const filled: FilledField[] = [];
  const attention: AttentionField[] = [];
  const attentionControls: FormControl[] = [];
  const seenGroups = new Set<string>();
  let alreadyFilled = 0;

  const controls = Array.from(doc.querySelectorAll<FormControl>('input, textarea, select'));
  for (const control of controls) {
    const group = groupKey(control);
    if (group) {
      if (seenGroups.has(group)) continue;
      seenGroups.add(group);
    }

    const classification = classify(control);
    if (classification.type === 'skip') continue;

    if (classification.type === 'attention') {
      control.classList.add(ATTENTION_CLASS);
      attention.push({ label: classification.label, reason: classification.reason });
      attentionControls.push(control);
      continue;
    }

    const value = profile[classification.kind]?.trim();
    const input = control as HTMLInputElement | HTMLTextAreaElement;
    if (!value) continue;
    if (input.value.trim()) {
      alreadyFilled++;
      continue;
    }
    setValue(input, value);
    control.classList.add(FILLED_CLASS);
    filled.push({ label: classification.label, kind: classification.kind, value });
  }

  return { filled, attention, alreadyFilled, answered: [], attentionControls };
}

export function clearAutofillHighlights(doc: Document): void {
  doc.querySelectorAll(`.${FILLED_CLASS}, .${ATTENTION_CLASS}`).forEach((element) => {
    element.classList.remove(FILLED_CLASS, ATTENTION_CLASS, ANSWERED_CLASS);
  });
}
