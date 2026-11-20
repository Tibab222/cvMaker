import crypto from "node:crypto";
import type Database from "better-sqlite3";
import {
    MAX_ANSWER_LENGTH,
    MAX_QUESTION_LENGTH,
    NEVER_KEPT_QUESTION,
    type AnswerKind,
    type AnswerMatch,
    type AnswerQuestion,
    type CapturedAnswer,
    type SavedAnswer,
    type SavedAnswerDto,
} from "../../../shared/answers.types";

/**
 * Answer bank: questions of application forms and the answers the user gave, offered again when another form asks
 * the same thing, even worded differently ("Are you legally eligible to work in Canada?" / "Are you authorized to
 * work in Canada?").
 *
 * Electron-free on purpose (dependencies are injected), so it can be exercised from plain Node.
 */

export interface AnswerBankDeps {
    getDb: () => Database.Database;
    isReady: () => boolean;
    /** Local embedding model (normalized vectors); null or throwing means word matching only. */
    embed: ((text: string) => Promise<Float32Array>) | null;
}

/**
 * Cosine similarity from which two questions are the same one asked differently (MiniLM, normalized vectors).
 * Measured: rewordings score 0.71-0.84 ("legally eligible" / "authorized to work": 0.84), different questions on the
 * same topic up to 0.67 ("eligible to work in Canada" / "currently employed in Canada"). Below this, nothing is filled.
 */
const SAME_MEANING = 0.8;
/** Without the model: share of words in common. */
const SAME_WORDS = 0.8;
const MAX_CAPTURE = 60;
const MAX_MATCH = 80;
const MAX_OPTIONS = 40;

interface AnswerRow {
    id: string;
    question: string;
    question_key: string;
    answer: string;
    kind: string;
    options: string;
    source_host: string | null;
    uses: number;
    embedding: Buffer | null;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
}

const toBlob = (vector: Float32Array) => Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
const fromBlob = (blob: unknown): Float32Array | null => {
    if (!Buffer.isBuffer(blob) || blob.byteLength === 0 || blob.byteLength % 4 !== 0) return null;
    return new Float32Array(new Uint8Array(blob).buffer);
};

const clean = (text: unknown, max: number) => (typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** "Are you legally eligible to work in Canada? *" -> "are you legally eligible to work in canada" */
export function questionKey(question: string): string {
    return question
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\((required|optional|obligatoire|facultatif)\)/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

const SMALL_WORDS = new Set([
    "a", "an", "the", "of", "to", "in", "on", "for", "and", "or", "is", "are", "do", "does", "you", "your", "with", "be", "at", "by",
    "le", "la", "les", "de", "des", "du", "un", "une", "et", "ou", "en", "a", "au", "aux", "vous", "votre", "vos", "est", "etes", "pour",
]);

const wordsOf = (question: string) => new Set(questionKey(question).split(" ").filter((word) => word && !SMALL_WORDS.has(word)));

/**
 * Names and numbers a question depends on: "work in Canada" is not "work in the US", "Python" is not "Java",
 * "5 years" is not "3 years". Capitalized words past the first one (unless the whole question is in Title Case),
 * and numbers.
 */
export function specifics(question: string): string {
    const words = question.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
    const rest = words.slice(1).filter((word) => word !== "I");
    const capitalized = rest.filter((word) => /^\p{Lu}/u.test(word));
    const titleCase = rest.length > 2 && capitalized.length / rest.length > 0.5;
    const named = titleCase ? capitalized.filter((word) => /^\p{Lu}{2,}$/u.test(word)) : capitalized;
    const numbers = words.filter((word) => /\d/.test(word));
    // "Do you require sponsorship?" is not "Don't you require sponsorship?"
    const negation = /\b(not|never|none|pas|jamais|aucun|aucune)\b|n['’]t\b/i.test(question) ? ["(not)"] : [];
    return [...new Set([...named, ...numbers, ...negation].map((word) => word.toLowerCase()))].sort().join(" ");
}

function wordOverlap(a: string, b: string): number {
    const left = wordsOf(a);
    const right = wordsOf(b);
    if (!left.size || !right.size) return 0;
    let shared = 0;
    for (const word of left) if (right.has(word)) shared++;
    return shared / Math.max(left.size, right.size);
}

const YES = /^(yes|oui|y|true|i do|i am|je suis)$/i;
const NO = /^(no|non|n|false|i do not|i don't|i am not|je ne suis pas)$/i;

/** The option of `options` that says the same as `answer` ("Yes" / "Oui" / "Yes, I am"), or null. */
export function pickOption(answer: string, options: string[]): string | null {
    const key = questionKey(answer);
    const exact = options.find((option) => questionKey(option) === key);
    if (exact) return exact;
    const yes = YES.test(answer.trim());
    const no = NO.test(answer.trim());
    if (!yes && !no) return null;
    // "Yes, I am legally eligible" / "No, I will require sponsorship"
    const wanted = yes ? /^(yes|oui)\b/i : /^(no|non)\b/i;
    const fits = options.filter((option) => wanted.test(option.trim()) || (yes ? YES : NO).test(option.trim()));
    return fits.length === 1 ? fits[0] : null;
}

export class AnswerBankManager {
    private readonly deps: AnswerBankDeps;

    constructor(deps: AnswerBankDeps) {
        this.deps = deps;
    }

    private db(): Database.Database {
        if (!this.deps.isReady()) throw new Error("Open a profile first.");
        return this.deps.getDb();
    }

    private toAnswer(row: AnswerRow): SavedAnswer {
        let options: string[] = [];
        try {
            const parsed = JSON.parse(row.options) as unknown;
            if (Array.isArray(parsed)) options = parsed.filter((option): option is string => typeof option === "string");
        } catch {
            // left empty
        }
        return {
            id: row.id,
            question: row.question,
            answer: row.answer,
            kind: row.kind === "choice" ? "choice" : "text",
            options,
            source_host: row.source_host,
            uses: row.uses,
            last_used_at: row.last_used_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private row(id: string): AnswerRow {
        const row = this.db().prepare(`SELECT * FROM form_answers WHERE id = ?`).get(id) as AnswerRow | undefined;
        if (!row) throw new Error("This answer no longer exists.");
        return row;
    }

    /** Most used first, then most recent. */
    public list(): SavedAnswer[] {
        if (!this.deps.isReady()) return [];
        const rows = this.db().prepare(`SELECT * FROM form_answers ORDER BY uses DESC, COALESCE(last_used_at, updated_at) DESC`).all() as AnswerRow[];
        return rows.map((row) => this.toAnswer(row));
    }

    private checked(dto: SavedAnswerDto): { question: string; answer: string; key: string } {
        const question = clean(dto.question, MAX_QUESTION_LENGTH + 1);
        const answer = clean(dto.answer, MAX_ANSWER_LENGTH + 1);
        if (question.length < 3) throw new Error("Write the question, as forms ask it.");
        if (question.length > MAX_QUESTION_LENGTH) throw new Error(`Keep the question under ${MAX_QUESTION_LENGTH} characters.`);
        if (!answer) throw new Error("Write the answer to give.");
        if (answer.length > MAX_ANSWER_LENGTH) throw new Error(`Keep the answer under ${MAX_ANSWER_LENGTH} characters.`);
        if (NEVER_KEPT_QUESTION.test(question)) throw new Error("Questions about identity, secrets or consent are never kept: answer them on each form.");
        const key = questionKey(question);
        if (!key) throw new Error("Write the question, as forms ask it.");
        return { question, answer, key };
    }

    private sameKey(key: string, except?: string): AnswerRow | undefined {
        return this.db().prepare(`SELECT * FROM form_answers WHERE question_key = ? AND id != ?`).get(key, except ?? "") as AnswerRow | undefined;
    }

    /** A question and its answer written in the app. */
    public add(dto: SavedAnswerDto, now = new Date()): SavedAnswer {
        const { question, answer, key } = this.checked(dto);
        if (this.sameKey(key)) throw new Error("You already have an answer for this question: edit that one.");
        const id = crypto.randomUUID();
        const at = now.toISOString();
        this.db().prepare(`
            INSERT INTO form_answers (id, question, question_key, answer, kind, options, source_host, uses, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'text', '[]', NULL, 0, ?, ?)
        `).run(id, question, key, answer, at, at);
        return this.toAnswer(this.row(id));
    }

    public update(id: string, dto: SavedAnswerDto, now = new Date()): SavedAnswer {
        const current = this.row(id);
        const { question, answer, key } = this.checked(dto);
        if (this.sameKey(key, id)) throw new Error("You already have an answer for this question: edit that one.");
        // a reworded question is embedded again on the next match
        const embedding = key === current.question_key ? current.embedding : null;
        this.db().prepare(`UPDATE form_answers SET question = ?, question_key = ?, answer = ?, embedding = ?, updated_at = ? WHERE id = ?`)
            .run(question, key, answer, embedding, now.toISOString(), id);
        return this.toAnswer(this.row(id));
    }

    public remove(id: string): boolean {
        if (!this.deps.isReady()) return false;
        return this.db().prepare(`DELETE FROM form_answers WHERE id = ?`).run(id).changes > 0;
    }

    /**
     * Answers read from a form the user filled: new questions are kept, known ones take the latest answer (the user
     * changed their mind, or the app's version was outdated). Questions never kept are dropped here too.
     * @returns how many answers were kept
     */
    public capture(answers: CapturedAnswer[], now = new Date()): number {
        const db = this.db();
        const at = now.toISOString();
        const find = db.prepare(`SELECT * FROM form_answers WHERE question_key = ?`);
        const insert = db.prepare(`
            INSERT INTO form_answers (id, question, question_key, answer, kind, options, source_host, uses, last_used_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        `);
        const update = db.prepare(`UPDATE form_answers SET answer = ?, kind = ?, options = ?, uses = uses + 1, last_used_at = ?, updated_at = ? WHERE id = ?`);
        const seen = db.prepare(`UPDATE form_answers SET options = ?, uses = uses + 1, last_used_at = ? WHERE id = ?`);
        let kept = 0;

        const run = db.transaction(() => {
            for (const raw of answers.slice(0, MAX_CAPTURE)) {
                const question = clean(raw?.question, MAX_QUESTION_LENGTH);
                const answer = clean(raw?.answer, MAX_ANSWER_LENGTH + 1);
                const kind: AnswerKind = raw?.kind === "choice" ? "choice" : "text";
                const key = questionKey(question);
                if (question.length < 3 || !key || !answer || answer.length > MAX_ANSWER_LENGTH || NEVER_KEPT_QUESTION.test(question)) continue;
                const options = Array.isArray(raw.options)
                    ? [...new Set(raw.options.map((option) => clean(option, 200)).filter(Boolean))].slice(0, MAX_OPTIONS)
                    : [];
                const host = clean(raw.host, 200) || null;
                const existing = find.get(key) as AnswerRow | undefined;
                if (!existing) {
                    insert.run(crypto.randomUUID(), question, key, answer, kind, JSON.stringify(options), host, at, at, at);
                } else {
                    const merged = JSON.stringify([...new Set([...this.toAnswer(existing).options, ...options])].slice(0, MAX_OPTIONS));
                    if (existing.answer === answer) seen.run(merged, at, existing.id);
                    else update.run(answer, kind, merged, at, at, existing.id);
                }
                kept++;
            }
        });
        run();
        return kept;
    }

    /** Embeds the saved questions that have no vector yet; false when the model is unavailable. */
    private async embedSaved(rows: AnswerRow[]): Promise<Map<string, Float32Array> | null> {
        const embed = this.deps.embed;
        if (!embed) return null;
        const vectors = new Map<string, Float32Array>();
        const store = this.db().prepare(`UPDATE form_answers SET embedding = ? WHERE id = ?`);
        try {
            for (const row of rows) {
                let vector = fromBlob(row.embedding);
                if (!vector) {
                    vector = await embed(row.question);
                    store.run(toBlob(vector), row.id);
                }
                vectors.set(row.id, vector);
            }
            return vectors;
        } catch (error) {
            console.warn("[AnswerBank] Embedding model unavailable, matching words only:", error);
            return null;
        }
    }

    /**
     * Saved answers for the questions of a form. A question gets an answer when it is the same as a saved one, or
     * means the same and names the same things (country, numbers); a choice question only when one of its options
     * says the saved answer.
     */
    public async match(questions: AnswerQuestion[]): Promise<AnswerMatch[]> {
        if (!this.deps.isReady()) return [];
        const rows = this.db().prepare(`SELECT * FROM form_answers`).all() as AnswerRow[];
        if (!rows.length) return [];
        const wanted = questions
            .slice(0, MAX_MATCH)
            .map((question) => ({
                ref: clean(question?.ref, 100),
                question: clean(question?.question, MAX_QUESTION_LENGTH),
                kind: question?.kind === "choice" ? "choice" as const : "text" as const,
                options: Array.isArray(question?.options) ? question.options.map((option) => clean(option, 200)).filter(Boolean).slice(0, 200) : [],
            }))
            .filter((question) => question.ref && question.question && !NEVER_KEPT_QUESTION.test(question.question));
        if (!wanted.length) return [];

        const byKey = new Map(rows.map((row) => [row.question_key, row]));
        const needModel = wanted.some((question) => !byKey.has(questionKey(question.question)));
        const vectors = needModel ? await this.embedSaved(rows) : null;

        const matches: AnswerMatch[] = [];
        for (const question of wanted) {
            const candidates: { row: AnswerRow; score: number }[] = [];
            const same = byKey.get(questionKey(question.question));
            if (same) candidates.push({ row: same, score: 1 });
            else {
                const asked = specifics(question.question);
                let vector: Float32Array | null = null;
                if (vectors) {
                    try {
                        vector = await this.deps.embed!(question.question);
                    } catch {
                        vector = null;
                    }
                }
                for (const row of rows) {
                    if (specifics(row.question) !== asked) continue;
                    const saved = vector ? vectors?.get(row.id) : undefined;
                    const score = vector && saved ? dot(vector, saved) : wordOverlap(question.question, row.question);
                    if (score >= (vector && saved ? SAME_MEANING : SAME_WORDS)) candidates.push({ row, score });
                }
                candidates.sort((a, b) => b.score - a.score);
            }

            for (const { row, score } of candidates) {
                const answer = question.kind === "choice" ? pickOption(row.answer, question.options) : row.answer;
                if (!answer) continue;
                matches.push({ ref: question.ref, answerId: row.id, answer, savedQuestion: row.question, score: Math.round(score * 100) / 100 });
                break;
            }
        }
        return matches;
    }
}

function dot(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;
    let sum = 0;
    for (let index = 0; index < a.length; index++) sum += a[index] * b[index];
    return sum;
}
