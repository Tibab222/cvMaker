import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { Language } from "../../../shared/profile.interface";
import { VAULT_MAX_BYTES, type VaultImportPayload, type VaultMatch, type VaultOffer, type VaultResume } from "../../../shared/vault.types";
import { normalizeTerm, scoreJob, titleWords, type ProfileSignals } from "../discovery/scoring";
import { foldText } from "../../utils/text";

/**
 * Resume vault: PDFs the user already has, stored in <profile>/vault/, read once for their text and keywords,
 * then ranked against any offer with the same scoring as the Opportunities queue.
 *
 * Electron-free on purpose (dependencies are injected), so it can be exercised from plain Node.
 */

export interface VaultDeps {
    getDb: () => Database.Database;
    isReady: () => boolean;
    /** Folder of the open profile. */
    getProfileDir: () => string | null;
    /** Language of the open profile, used when a resume's own language cannot be told. */
    getProfileLanguage: () => Promise<Language>;
    extractKeywords: (text: string, language: Language) => string[];
    /** Local embedding model; null or throwing means keyword-only matching. */
    embed: ((text: string) => Promise<Float32Array>) | null;
}

const VAULT_DIR = "vault";
const MAX_KEYWORDS = 60;
/** The extractor keeps the 25 strongest terms of a text: reading the resume in chunks catches the rest. */
const CHUNK_SIZE = 1500;

const FRENCH_HINTS = /\b(le|la|les|des|et|pour|avec|dans|une|du|au|sur|est|nous|vous|expérience|compétences|formation)\b/gi;
const ENGLISH_HINTS = /\b(the|and|with|for|of|to|in|on|is|we|you|experience|skills|education)\b/gi;

/** French or English, from the most common small words. Null when the text is too short to tell. */
export function detectLanguage(text: string): Language | null {
    const french = text.match(FRENCH_HINTS)?.length ?? 0;
    const english = text.match(ENGLISH_HINTS)?.length ?? 0;
    if (french + english < 10) return null;
    return french > english ? Language.FRENCH : Language.ENGLISH;
}

/** "Resume_DevOps-2026 (1).pdf" -> "Resume DevOps 2026" */
export function nameFromFile(fileName: string): string {
    const base = path.basename(fileName).replace(/\.pdf$/i, "").replace(/\s*\(\d+\)$/, "");
    const cleaned = base.replace(/[_]+/g, " ").replace(/\s*-\s*/g, " - ").replace(/\s+/g, " ").trim();
    return cleaned.slice(0, 120) || "Resume";
}

const toBlob = (vector: Float32Array) => Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
const fromBlob = (blob: unknown): Float32Array | null => {
    if (!Buffer.isBuffer(blob) || blob.byteLength === 0 || blob.byteLength % 4 !== 0) return null;
    // copy: the buffer may not be aligned for a Float32Array view
    return new Float32Array(new Uint8Array(blob).buffer);
};

interface VaultRow {
    id: string;
    name: string;
    file_name: string;
    stored_file: string;
    size: number;
    pages: number;
    language: string;
    text: string;
    keywords: string;
    thumbnail: string | null;
    embedding: Buffer | null;
    created_at: string;
    updated_at: string;
}

export class VaultManager {
    private readonly deps: VaultDeps;

    constructor(deps: VaultDeps) {
        this.deps = deps;
    }

    private toResume(row: VaultRow): VaultResume {
        let keywords: string[] = [];
        try {
            keywords = JSON.parse(row.keywords);
        } catch {
            keywords = [];
        }
        return {
            id: row.id,
            name: row.name,
            file_name: row.file_name,
            size: row.size,
            pages: row.pages,
            language: row.language as Language,
            keywords,
            thumbnail: row.thumbnail,
            has_text: row.text.trim().length > 0,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    public list(): VaultResume[] {
        if (!this.deps.isReady()) return [];
        const rows = this.deps.getDb().prepare(`SELECT * FROM vault_resumes ORDER BY updated_at DESC, created_at DESC`).all() as VaultRow[];
        return rows.map((row) => this.toResume(row));
    }

    private row(id: string): VaultRow {
        const row = this.deps.getDb().prepare(`SELECT * FROM vault_resumes WHERE id = ?`).get(id) as VaultRow | undefined;
        if (!row) throw new Error("This resume is no longer in the vault.");
        return row;
    }

    /** Strongest terms of the whole text, then of each chunk, without duplicates ("Node.js" and "nodejs" are one). */
    public extractResumeKeywords(text: string, language: Language): string[] {
        const seen = new Map<string, string>();
        const add = (terms: string[]) => terms.forEach((term) => {
            const key = normalizeTerm(term);
            if (key.length > 1 && !seen.has(key)) seen.set(key, term.trim());
        });
        add(this.deps.extractKeywords(text, language));
        for (let start = 0; start < text.length && seen.size < MAX_KEYWORDS; start += CHUNK_SIZE) {
            add(this.deps.extractKeywords(text.slice(start, start + CHUNK_SIZE), language));
        }
        return [...seen.values()].slice(0, MAX_KEYWORDS);
    }

    /** Stores the PDF with what was read from it. Throws a readable error for anything that is not a usable PDF. */
    public async import(payload: VaultImportPayload): Promise<VaultResume> {
        if (!this.deps.isReady()) throw new Error("Open a profile before adding resumes.");
        const profileDir = this.deps.getProfileDir();
        if (!profileDir) throw new Error("Open a profile before adding resumes.");

        const bytes = Buffer.from(payload.bytes);
        if (bytes.byteLength === 0) throw new Error("This file is empty.");
        if (bytes.byteLength > VAULT_MAX_BYTES) throw new Error(`This PDF is over ${VAULT_MAX_BYTES / 1024 / 1024} MB.`);
        if (bytes.subarray(0, 1024).indexOf("%PDF-") === -1) throw new Error("This file is not a PDF.");

        const db = this.deps.getDb();
        const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
        const existing = db.prepare(`SELECT name FROM vault_resumes WHERE sha256 = ?`).get(sha256) as { name: string } | undefined;
        if (existing) throw new Error(`This PDF is already in your vault, as "${existing.name}".`);

        // some PDFs carry NUL characters in their text layer: SQLite would cut the text there
        const text = (payload.text ?? "").split(String.fromCharCode(0)).join("").trim().slice(0, 100_000);
        const language = detectLanguage(text) ?? (await this.deps.getProfileLanguage());
        const keywords = text ? this.extractResumeKeywords(text, language) : [];

        let embedding: Buffer | null = null;
        if (text && this.deps.embed) {
            try {
                embedding = toBlob(await this.deps.embed(text.slice(0, 2000)));
            } catch (error) {
                console.warn("[Vault] Embedding model unavailable, keyword-only matching:", error);
            }
        }

        const id = crypto.randomUUID();
        const dir = path.join(profileDir, VAULT_DIR);
        fs.mkdirSync(dir, { recursive: true });
        const storedFile = `${id}.pdf`;
        fs.writeFileSync(path.join(dir, storedFile), bytes);

        try {
            db.prepare(`
                INSERT INTO vault_resumes (id, name, file_name, stored_file, sha256, size, pages, language, text, keywords, thumbnail, embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                nameFromFile(payload.fileName),
                path.basename(payload.fileName).slice(0, 255),
                storedFile,
                sha256,
                bytes.byteLength,
                Math.max(0, Math.floor(payload.pages || 0)),
                language,
                text,
                JSON.stringify(keywords),
                typeof payload.thumbnail === "string" && payload.thumbnail.startsWith("data:image/") ? payload.thumbnail : null,
                embedding,
            );
        } catch (error) {
            fs.rmSync(path.join(dir, storedFile), { force: true });
            throw error;
        }
        return this.toResume(this.row(id));
    }

    public rename(id: string, name: string): VaultResume {
        const clean = name.replace(/\s+/g, " ").trim().slice(0, 120);
        if (!clean) throw new Error("Give this resume a name.");
        this.deps.getDb().prepare(`UPDATE vault_resumes SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(clean, id);
        return this.toResume(this.row(id));
    }

    public remove(id: string): boolean {
        const row = this.deps.getDb().prepare(`SELECT stored_file FROM vault_resumes WHERE id = ?`).get(id) as { stored_file: string } | undefined;
        if (!row) return false;
        this.deps.getDb().prepare(`DELETE FROM vault_resumes WHERE id = ?`).run(id);
        const profileDir = this.deps.getProfileDir();
        if (profileDir) fs.rmSync(path.join(profileDir, VAULT_DIR, row.stored_file), { force: true });
        return true;
    }

    /** Absolute path of the stored PDF, to open it or show it in its folder. */
    public filePath(id: string): string {
        const profileDir = this.deps.getProfileDir();
        if (!profileDir) throw new Error("Open a profile first.");
        const file = path.join(profileDir, VAULT_DIR, this.row(id).stored_file);
        if (!fs.existsSync(file)) throw new Error("The PDF of this resume is missing from the profile folder.");
        return file;
    }

    /** Copy of the stored PDF, e.g. for the browser extension to attach it to an application form. */
    public readFile(id: string): { fileName: string; bytes: Buffer } {
        return { fileName: this.row(id).file_name, bytes: fs.readFileSync(this.filePath(id)) };
    }

    /** Resumes ranked for an offer, best first. Resumes without text (scanned PDFs) cannot be ranked and are left out. */
    public async match(offer: VaultOffer, limit = 10): Promise<VaultMatch[]> {
        if (!this.deps.isReady()) return [];
        const title = (offer.title ?? "").trim();
        const description = (offer.description ?? "").trim();
        if (!title && !description) return [];

        const rows = this.deps.getDb().prepare(`SELECT * FROM vault_resumes WHERE text != ''`).all() as VaultRow[];
        if (rows.length === 0) return [];

        // the offer is read once, whatever the number of resumes
        const offerLanguage = detectLanguage(`${title}\n${description}`) ?? (await this.deps.getProfileLanguage());
        const keywordCache = new Map<string, string[]>();
        const extractKeywords = (text: string) => {
            if (!keywordCache.has(text)) keywordCache.set(text, this.deps.extractKeywords(text, offerLanguage));
            return keywordCache.get(text)!;
        };
        let offerVector: Promise<Float32Array> | null = null;
        const embed = this.deps.embed;
        const embedOnce = embed ? (text: string) => (offerVector ??= embed(text)) : undefined;

        const matches: VaultMatch[] = [];
        for (const row of rows) {
            const resume = this.toResume(row);
            const signals: ProfileSignals = {
                terms: new Map(resume.keywords.map((keyword) => [normalizeTerm(keyword), keyword])),
                text: foldText(row.text),
                // the headline of a resume (first lines) and its name say which role it targets
                titleWords: new Set([...titleWords(resume.name), ...titleWords(row.text.split("\n").slice(0, 3).join(" "))]),
                summary: row.text.slice(0, 2000),
            };
            const vector = fromBlob(row.embedding);
            const result = await scoreJob({ title, description }, signals, {
                extractKeywords,
                embed: vector ? embedOnce : undefined,
                profileVector: vector,
            });
            matches.push({ resume_id: row.id, name: row.name, score: result.score, matched: result.matched, missing: result.missing });
        }
        return matches.sort((a, b) => b.score - a.score).slice(0, limit);
    }
}
