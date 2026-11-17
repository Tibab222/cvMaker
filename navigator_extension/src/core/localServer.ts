import type { AutofillProfile, CVMakerPayload } from './messages';

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
    const res = await fetch(`${BASE_URL}${path}`, { ...init, signal: controller.signal });
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
