import type { AutofillProfile, CVMakerPayload, VaultFile, VaultMatch, VaultResume } from './messages';
import { AppOfflineError, type AppApplication, type AppSaveAnswer } from '../background/tracker';

/** The desktop app's local server (electron/services/HttpServer). It only listens on this machine. */
const BASE_URL = 'http://127.0.0.1:9123';

export interface AppStatus {
  online: boolean;
  profileLoaded: boolean;
  profileName: string | null;
}

interface ServerAnswer {
  status: 'success' | 'error';
  message?: string;
  [key: string]: unknown;
}

async function request(path: string, init?: RequestInit, timeoutMs = 4000): Promise<{ ok: boolean; status: number; body: ServerAnswer }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Firefox sends no Origin from extension pages that have host permissions: this header tells the app who asks
    const headers = new Headers(init?.headers);
    headers.set('X-CVMaker-Client', 'extension');
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
    const body = (await res.json().catch(() => ({ status: 'error', message: `HTTP ${res.status}` }))) as ServerAnswer;
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

export async function getAppStatus(): Promise<AppStatus> {
  try {
    const { ok, body } = await request('/api/status', undefined, 1500);
    if (!ok) return { online: false, profileLoaded: false, profileName: null };
    return { online: true, profileLoaded: body.profileLoaded === true, profileName: (body.profileName as string) ?? null };
  } catch {
    return { online: false, profileLoaded: false, profileName: null };
  }
}

export async function getAutofillProfile(): Promise<AutofillProfile> {
  let answer;
  try {
    answer = await request('/api/profile');
  } catch {
    throw new Error('CVMaker is not running. Open the desktop app first.');
  }
  if (!answer.ok) throw new Error(answer.body.message || 'Could not read your profile');
  return answer.body.profile as AutofillProfile;
}

export async function sendOffer(payload: CVMakerPayload): Promise<string> {
  let answer;
  try {
    answer = await request('/api/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 15000);
  } catch {
    throw new Error('CVMaker is not running. Open the desktop app first.');
  }
  if (!answer.ok) throw new Error(answer.body.message || 'The app refused the offer');
  return answer.body.message || 'Sent';
}

const OFFLINE = 'CVMaker is not running. Open the desktop app first.';

/** GET/POST that throws a readable error: the app is down, or it refused (message from the app). */
async function call(path: string, init: RequestInit | undefined, timeoutMs: number, fallback: string): Promise<ServerAnswer> {
  let answer;
  try {
    answer = await request(path, init, timeoutMs);
  } catch {
    throw new Error(OFFLINE);
  }
  if (!answer.ok) throw new Error(answer.body.message || fallback);
  return answer.body;
}

/** Resumes of the vault, most recent first. */
export async function getVault(): Promise<VaultResume[]> {
  const body = await call('/api/vault', undefined, 5000, 'Could not read your vault');
  return (body.resumes as VaultResume[]) ?? [];
}

/** Vault resumes ranked for an offer, best first (only those with readable text). */
export async function matchVault(offer: { title: string; description: string }): Promise<VaultMatch[]> {
  // the first ranking may load the local language model: give it time
  const body = await call('/api/vault/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...offer, limit: 50 }),
  }, 30000, 'Could not rank your resumes');
  return (body.matches as VaultMatch[]) ?? [];
}

/**
 * Records an application the user confirmed sending. The app merges it with the one already in the pipeline
 * (a resume made in CVMaker for this offer moves to Applied) instead of adding a duplicate.
 * @throws AppOfflineError when it should be sent again later (app closed, no profile open yet)
 */
export async function saveApplication(application: AppApplication): Promise<AppSaveAnswer> {
  let answer;
  try {
    answer = await request('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(application),
    }, 15000);
  } catch {
    throw new AppOfflineError(OFFLINE);
  }
  if (answer.status === 409 && answer.body.code === 'no-profile') throw new AppOfflineError(String(answer.body.message));
  if (!answer.ok) throw new Error(answer.body.message || 'CVMaker refused this application');
  const action = answer.body.action;
  return {
    action: action === 'promoted' || action === 'duplicate' ? action : 'created',
    message: answer.body.message || 'Saved to CVMaker',
  };
}

export async function getVaultFile(id: string): Promise<VaultFile> {
  const body = await call(`/api/vault/file?id=${encodeURIComponent(id)}`, undefined, 15000, 'Could not read this resume');
  return { fileName: String(body.fileName), mime: String(body.mime || 'application/pdf'), data: String(body.data) };
}
