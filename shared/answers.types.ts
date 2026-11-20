/**
 * Answer bank: the answers the user gave to application-form questions ("Are you legally eligible to work in
 * Canada?"), kept by the browser extension and offered again on the next form that asks the same thing.
 */

/** A free-text answer, or an option picked in a list / radio group. */
export type AnswerKind = 'text' | 'choice';

export interface SavedAnswer {
    id: string;
    question: string;
    answer: string;
    kind: AnswerKind;
    /** Options the question offered when it was answered (choice questions). */
    options: string[];
    /** Site the answer was first given on, null when added in the app. */
    source_host: string | null;
    /** Times the answer was seen in a form, given by hand or filled by the extension. */
    uses: number;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
}

/** An answer read from a form the user filled and moved on from. */
export interface CapturedAnswer {
    question: string;
    answer: string;
    kind: AnswerKind;
    options?: string[];
    host?: string;
}

/** A question of a form being filled, sent to find a saved answer. */
export interface AnswerQuestion {
    /** Identifies the field in the page; given back with the match. */
    ref: string;
    question: string;
    kind: AnswerKind;
    options?: string[];
}

export interface AnswerMatch {
    ref: string;
    answerId: string;
    /** What to type, or the option to pick (one of the question's options). */
    answer: string;
    /** The saved question it comes from, so the user sees why. */
    savedQuestion: string;
    /** 1 for the same question, lower for one asked differently. */
    score: number;
}

export interface SavedAnswerDto {
    question: string;
    answer: string;
}

export type SavedAnswerResult = { ok: true; answer: SavedAnswer } | { ok: false; error: string };

export const MAX_QUESTION_LENGTH = 300;
export const MAX_ANSWER_LENGTH = 1000;

/**
 * Questions never kept nor filled: identity and self-identification (gender, ethnicity, disability, veteran...),
 * secrets, and consents, which must be read every time.
 */
export const NEVER_KEPT_QUESTION = new RegExp([
    'gender', 'sexe', '\\bgenre\\b', 'pronoun', '\\brace\\b', 'ethnic', '[ée]thni', 'origine', 'indigenous', 'autochtone', 'aboriginal',
    'veteran', 'v[ée]t[ée]ran', 'disab', 'handicap', 'religio', 'sexual', 'orientation sexuelle', 'lgbt', 'minorit', 'visible minority',
    'date of birth', 'birth ?date', 'naissance', '\\bage\\b', '\\bssn\\b', 'social security', 's[ée]curit[ée] sociale', '\\bnas\\b', '\\bsin\\b',
    'social insurance', 'assurance sociale', 'password', 'mot de passe', 'passport', 'passeport', 'driver.?s licen', 'permis de conduire',
    'credit card', 'carte de cr[ée]dit', 'bank', 'banc', 'consent', 'privacy', 'gdpr', 'rgpd', 'terms', 'conditions', 'i agree', "j'accepte",
    'signature', 'sign here', 'captcha',
].join('|'), 'i');
