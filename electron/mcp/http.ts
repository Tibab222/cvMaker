import type { IncomingMessage, ServerResponse } from 'http';
import { timingSafeEqual } from 'crypto';
import type { McpCallRequest } from '../../shared/mcp.types';
import type { McpRegistry } from './core/registry';

export type McpRoute = (req: IncomingMessage, res: ServerResponse, route: string) => void;

const MAX_BODY_BYTES = 1024 * 1024;

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sameToken(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      body += chunk.toString('utf-8');
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON not valid'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * /api/mcp/* on the app's local server, for the bridge only. Browsers are kept out twice: any Origin header is
 * refused, and the Host must be the loopback address (DNS rebinding); then the bearer token is checked.
 */
export function createMcpRoute(registry: McpRegistry, token: string, serverUrl: string): McpRoute {
  const port = new URL(serverUrl).port;
  const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);

  return (req, res, route) => {
    if (req.headers.origin || !allowedHosts.has(req.headers.host ?? '')) {
      send(res, 403, { error: 'Forbidden' });
      return;
    }
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ') || !sameToken(auth.slice(7), token)) {
      send(res, 401, { error: 'Bad token' });
      return;
    }

    if (req.method === 'GET' && route === '/api/mcp/manifest') {
      send(res, 200, registry.manifest());
    } else if (req.method === 'POST' && route === '/api/mcp/call') {
      readJson(req)
        .then(async (body) => {
          const { name, arguments: args } = (body ?? {}) as McpCallRequest;
          if (typeof name !== 'string') return send(res, 400, { error: 'Tool name missing' });
          send(res, 200, await registry.call(name, args));
        })
        .catch((error: Error) => send(res, 400, { error: error.message }));
    } else {
      send(res, 404, { error: 'Route not found' });
    }
  };
}
