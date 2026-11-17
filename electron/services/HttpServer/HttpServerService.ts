import http, { Server, IncomingMessage, ServerResponse } from 'http';
import { BrowserWindow } from 'electron';
import { JobOfferPayload } from '../../../shared/Extension.types';

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
      this.handleCors(res);

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/api/job') {
        this.handleJobEndpoint(req, res, mainWindowGetter);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Route not found' }));
      }
    });

    this.server.listen(this.PORT, this.HOST, () => {
      console.log(`[HttpServerService] Listening on http://${this.HOST}:${this.PORT}`);
    });
  }

  private handleCors(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  private handleJobEndpoint(
    req: IncomingMessage,
    res: ServerResponse,
    mainWindowGetter: () => BrowserWindow | null
  ): void {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const jobData: JobOfferPayload = JSON.parse(body);
        console.log('[HttpServerService] Offer received :', jobData);

        const mainWindow = mainWindowGetter();
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();

          mainWindow.webContents.send('JOB_RECEIVED_FROM_EXTENSION', jobData);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Offer received successfully' }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'JSON not valid: ' + (error instanceof Error ? error.message : '') }));
      }
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('[HttpServerService] Serveur arrêté.');
    }
  }
}