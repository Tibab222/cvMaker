import http, { Server, IncomingMessage, ServerResponse } from 'http';
import { BrowserWindow } from 'electron';
import { JobOfferPayload } from '../../../shared/Extension.types';

/** Origins of browser-extension pages (Chrome/Edge/Brave and Firefox). Regular websites never match. */
const EXTENSION_ORIGIN = /^(chrome-extension|moz-extension|safari-web-extension):\/\/[a-z0-9-]+$/i;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // a job posting is a few KB; this only guards against abuse

export class HttpServerService {
  private static instance: HttpServerService;
  private server: Server | null = null;
  private readonly PORT = 9123;
  private readonly HOST = '127.0.0.1';

  private constructor() {}

  public static getInstance(): HttpServerService {
    if (!HttpServerService.instance) {
      HttpServerService.instance = new HttpServerService();
    }
    return HttpServerService.instance;
  }

  public init(mainWindowGetter: () => BrowserWindow | null): void {
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

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/api/job') {
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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('[HttpServerService] Server stopped.');
    }
  }
}
