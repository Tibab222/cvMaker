import http, { Server, IncomingMessage, ServerResponse } from 'http';
import { BrowserWindow } from 'electron';
import { JobOfferPayload } from '../../../shared/Extension.types';
import { AutofillProfile, LocalServerStatus } from '../../../shared/discovery.types';
import type { ExtensionVaultResume, VaultMatch, VaultOffer } from '../../../shared/vault.types';
import { ApplicationChannel, type BrowserApplicationDto, type BrowserApplicationResult } from '../../../shared/jobApplications.type';

/** Resume vault, for the extension to pick a resume and attach it to an application form. */
export interface LocalVaultHandlers {
  list: () => ExtensionVaultResume[];
  match: (offer: VaultOffer, limit: number) => Promise<VaultMatch[]>;
  file: (id: string) => { fileName: string; bytes: Buffer };
}

/** What the server can do besides opening an offer in the editor. Injected, so this file stays free of app logic. */
export interface LocalServerHandlers {
  getStatus: () => LocalServerStatus;
  getAutofillProfile: () => Promise<AutofillProfile | null>;
  queueJob: (payload: JobOfferPayload) => Promise<{ id: number; score: number | null; duplicate: boolean }>;
  vault?: LocalVaultHandlers;
  /** An application the user confirmed sending, seen by the extension. Throws a readable message when refused. */
  recordApplication?: (dto: BrowserApplicationDto) => Promise<BrowserApplicationResult>;
}

const RECORD_MESSAGES: Record<BrowserApplicationResult['action'], string> = {
  created: 'Saved to CVMaker',
  promoted: 'Moved to Applied in CVMaker (the resume you prepared for it)',
  duplicate: 'Already in your CVMaker pipeline',
};
const CHANNELS = new Set<string>(Object.values(ApplicationChannel));

/** Origins of browser-extension pages (Chrome/Edge/Brave and Firefox). Regular websites never match. */
const EXTENSION_ORIGIN = /^(chrome-extension|moz-extension|safari-web-extension):\/\/[a-z0-9-]+$/i;
/** Header the browser extension adds to every request (navigator_extension/src/core/localServer.ts). */
const CLIENT_HEADER = 'x-cvmaker-client';
const CLIENT_NAME = 'extension';
const MAX_BODY_BYTES = 2 * 1024 * 1024; // a job posting is a few KB; this only guards against abuse

/** Reads the optional delivery mode without failing on bad JSON (parsing errors are reported elsewhere). */
function parsedMode(body: string): string | null {
  try {
    const mode = (JSON.parse(body) as { mode?: unknown }).mode;
    return typeof mode === 'string' ? mode : null;
  } catch {
    return null;
  }
}

export class HttpServerService {
  private static instance: HttpServerService;
  private server: Server | null = null;
  private readonly PORT = 9123;
  private readonly HOST = '127.0.0.1';
  private handlers: LocalServerHandlers | null = null;

  private constructor() {}

  public static getInstance(): HttpServerService {
    if (!HttpServerService.instance) {
      HttpServerService.instance = new HttpServerService();
    }
    return HttpServerService.instance;
  }

  public init(mainWindowGetter: () => BrowserWindow | null, handlers?: LocalServerHandlers): void {
    this.handlers = handlers ?? null;
    if (this.server) {
      console.warn('[HttpServerService] Server is already initialized.');
      return;
    }

    this.server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
      const origin = req.headers.origin;

      // Any web page can fire a "simple" POST at localhost without a CORS preflight, so the origin is checked
      // here rather than trusting the browser. Requests without Origin come from local tools (curl, scripts).
      if (origin && !EXTENSION_ORIGIN.test(origin)) {
        this.sendJson(res, 403, { status: 'error', message: 'Origin not allowed' });
        return;
      }
      if (origin) this.handleCors(res, origin);

      // Chrome sends the extension origin. Firefox does not when the extension has host permissions (no CORS then),
      // so the extension also names itself in a custom header: a web page cannot send that header here without a
      // CORS preflight, and the preflight carries its own origin, refused above.
      const fromExtension = origin ? true : req.headers[CLIENT_HEADER] === CLIENT_NAME;

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const route = (req.url ?? '').split('?')[0];
      if (req.method === 'GET' && route === '/api/status') {
        this.sendJson(res, 200, { status: 'success', ...(this.handlers?.getStatus() ?? { app: 'cvmaker', profileLoaded: false, profileName: null }) });
      } else if (req.method === 'GET' && route === '/api/profile') {
        // personal data: only for the extension itself
        if (!fromExtension) {
          this.sendJson(res, 403, { status: 'error', message: 'Only the browser extension can read the profile' });
          return;
        }
        this.handleProfileEndpoint(res);
      } else if (route.startsWith('/api/vault')) {
        // personal files: only for the extension itself, like the profile
        if (!fromExtension) {
          this.sendJson(res, 403, { status: 'error', message: 'Only the browser extension can read the vault' });
          return;
        }
        void this.handleVault(req, res, route);
      } else if (req.method === 'POST' && route === '/api/applications') {
        // writes to the user's pipeline: only the extension itself
        if (!fromExtension) {
          this.sendJson(res, 403, { status: 'error', message: 'Only the browser extension can record applications' });
          return;
        }
        void this.handleRecordApplication(req, res);
      } else if (req.method === 'POST' && route === '/api/job') {
        this.handleJobEndpoint(req, res, mainWindowGetter);
      } else {
        this.sendJson(res, 404, { status: 'error', message: 'Route not found' });
      }
    });

    this.server.on('error', (error: NodeJS.ErrnoException) => {
      // without this handler a busy port (e.g. a second app instance) would crash the main process
      if (error.code === 'EADDRINUSE') {
        console.error(`[HttpServerService] Port ${this.PORT} already in use: the browser extension will not reach this window.`);
      } else {
        console.error('[HttpServerService] Server error:', error);
      }
      this.server = null;
    });

    this.server.listen(this.PORT, this.HOST, () => {
      console.log(`[HttpServerService] Listening on http://${this.HOST}:${this.PORT}`);
    });
  }

  private handleCors(res: ServerResponse, origin: string): void {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', `Content-Type, ${CLIENT_HEADER}`);
  }

  private sendJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  private parsePayload(raw: unknown): JobOfferPayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

    const payload: JobOfferPayload = {
      title: text(data.title),
      company: text(data.company),
      salary: text(data.salary) || undefined,
      url: text(data.url),
      mandate: text(data.mandate),
      extractedAt: text(data.extractedAt) || new Date().toISOString(),
    };
    if (payload.url && !/^https?:\/\//i.test(payload.url)) payload.url = '';
    return payload.title || payload.mandate ? payload : null;
  }

  private handleJobEndpoint(
    req: IncomingMessage,
    res: ServerResponse,
    mainWindowGetter: () => BrowserWindow | null
  ): void {
    let body = '';
    let size = 0;
    let aborted = false;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        aborted = true;
        this.sendJson(res, 413, { status: 'error', message: 'Payload too large' });
        req.destroy();
        return;
      }
      body += chunk.toString('utf-8');
    });

    req.on('end', () => {
      if (aborted) return;
      let jobData: JobOfferPayload | null = null;
      try {
        jobData = this.parsePayload(JSON.parse(body));
      } catch (error) {
        this.sendJson(res, 400, { status: 'error', message: 'JSON not valid: ' + (error instanceof Error ? error.message : '') });
        return;
      }
      if (!jobData) {
        this.sendJson(res, 422, { status: 'error', message: 'A job offer needs at least a title or a description' });
        return;
      }

      console.log(`[HttpServerService] Offer received: ${jobData.title} @ ${jobData.company}`);

      // 'queue': keep it for the morning review instead of opening the editor now
      if ((parsedMode(body)) === 'queue') {
        this.queueJob(res, jobData);
        return;
      }
      const mainWindow = mainWindowGetter();
      if (!mainWindow || mainWindow.isDestroyed()) {
        this.sendJson(res, 503, { status: 'error', message: 'CV Maker window is not open' });
        return;
      }
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send('JOB_RECEIVED_FROM_EXTENSION', jobData);

      this.sendJson(res, 200, { status: 'success', message: 'Offer received successfully' });
    });
  }

  private async handleProfileEndpoint(res: ServerResponse): Promise<void> {
    try {
      const profile = await this.handlers?.getAutofillProfile();
      if (!profile) {
        this.sendJson(res, 409, { status: 'error', message: 'Open a profile in CV Maker first' });
        return;
      }
      this.sendJson(res, 200, { status: 'success', profile });
    } catch (error) {
      console.error('[HttpServerService] Profile read failed:', error);
      this.sendJson(res, 500, { status: 'error', message: 'Could not read the profile' });
    }
  }

  /** Body of a small JSON request; null (and an answer already sent) when it is too large or not JSON. */
  private readJson(req: IncomingMessage, res: ServerResponse, maxBytes: number): Promise<Record<string, unknown> | null> {
    return new Promise((resolve) => {
      let body = '';
      let size = 0;
      let aborted = false;
      req.on('data', (chunk: Buffer) => {
        if (aborted) return;
        size += chunk.length;
        if (size > maxBytes) {
          aborted = true;
          // the rest is read and dropped (not cut off), so the client gets the answer instead of a reset
          res.setHeader('Connection', 'close');
          this.sendJson(res, 413, { status: 'error', message: 'Payload too large' });
          req.resume();
          resolve(null);
          return;
        }
        body += chunk.toString('utf-8');
      });
      req.on('end', () => {
        if (aborted) return;
        try {
          const parsed = JSON.parse(body) as unknown;
          if (parsed && typeof parsed === 'object') return resolve(parsed as Record<string, unknown>);
        } catch {
          /* answered below */
        }
        this.sendJson(res, 400, { status: 'error', message: 'JSON not valid' });
        resolve(null);
      });
    });
  }

  private async handleVault(req: IncomingMessage, res: ServerResponse, route: string): Promise<void> {
    const vault = this.handlers?.vault;
    if (!vault) {
      this.sendJson(res, 503, { status: 'error', message: 'Resume vault not available' });
      return;
    }
    if (!this.handlers?.getStatus().profileLoaded) {
      this.sendJson(res, 409, { status: 'error', message: 'Open a profile in CV Maker first' });
      return;
    }
    try {
      if (req.method === 'GET' && route === '/api/vault') {
        this.sendJson(res, 200, { status: 'success', resumes: vault.list() });
      } else if (req.method === 'POST' && route === '/api/vault/match') {
        const data = await this.readJson(req, res, MAX_BODY_BYTES);
        if (!data) return;
        const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
        const offer: VaultOffer = { title: text(data.title, 300), description: text(data.description, 60_000) };
        const limit = Math.min(Math.max(Math.floor(Number(data.limit)) || 10, 1), 50);
        this.sendJson(res, 200, { status: 'success', matches: await vault.match(offer, limit) });
      } else if (req.method === 'GET' && route === '/api/vault/file') {
        const id = new URL(req.url ?? '', 'http://localhost').searchParams.get('id') ?? '';
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          this.sendJson(res, 400, { status: 'error', message: 'Unknown resume' });
          return;
        }
        const { fileName, bytes } = vault.file(id);
        // JSON + base64: the extension hands it to the page as a message, which carries text, not binary
        this.sendJson(res, 200, { status: 'success', fileName, mime: 'application/pdf', data: bytes.toString('base64') });
      } else {
        this.sendJson(res, 404, { status: 'error', message: 'Route not found' });
      }
    } catch (error) {
      console.error('[HttpServerService] Vault request failed:', error);
      this.sendJson(res, 409, { status: 'error', message: error instanceof Error ? error.message : 'Vault request failed' });
    }
  }

  private async handleRecordApplication(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const record = this.handlers?.recordApplication;
    if (!record) {
      this.sendJson(res, 503, { status: 'error', message: 'Applications cannot be recorded from the browser' });
      return;
    }
    // no profile open yet: the extension keeps it and sends it again later
    if (!this.handlers?.getStatus().profileLoaded) {
      this.sendJson(res, 409, { status: 'error', code: 'no-profile', message: 'Open a profile in CV Maker first' });
      return;
    }
    const data = await this.readJson(req, res, MAX_BODY_BYTES);
    if (!data) return;
    const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
    const channel = text(data.channel, 40);
    const dto: BrowserApplicationDto = {
      company: text(data.company, 200),
      title: text(data.title, 200),
      appliedOn: text(data.appliedOn, 10),
      url: text(data.url, 2000),
      description: text(data.description, 50_000),
      salary: text(data.salary, 100),
      channel: CHANNELS.has(channel) ? (channel as ApplicationChannel) : null,
    };
    try {
      const result = await record(dto);
      const { id, job_title, company_name, status } = result.application;
      this.sendJson(res, 200, { status: 'success', action: result.action, message: RECORD_MESSAGES[result.action], application: { id, job_title, company_name, status } });
    } catch (error) {
      this.sendJson(res, 422, { status: 'error', message: error instanceof Error ? error.message : 'Could not record the application' });
    }
  }

  private async queueJob(res: ServerResponse, jobData: JobOfferPayload): Promise<void> {
    if (!this.handlers) {
      this.sendJson(res, 503, { status: 'error', message: 'Queue not available' });
      return;
    }
    try {
      const result = await this.handlers.queueJob(jobData);
      this.sendJson(res, 200, { status: 'success', message: result.duplicate ? 'Already in your queue' : 'Added to your queue', ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not queue the offer';
      this.sendJson(res, 409, { status: 'error', message });
    }
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('[HttpServerService] Server stopped.');
    }
  }
}
