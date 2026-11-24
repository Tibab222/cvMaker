import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { MCP_CONNECTION_FILE, type McpConnection, type McpManifest } from '../../shared/mcp.types';

function previousToken(file: string): string | null {
  try {
    const { token } = JSON.parse(fs.readFileSync(file, 'utf-8')) as Partial<McpConnection>;
    return typeof token === 'string' && /^[0-9a-f]{64}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

/**
 * Writes mcp.json for the bridge. The token is kept across launches, so an MCP client already set up keeps working;
 * the manifest is rewritten every time, so the bridge lists the current tools even while the app is closed.
 * @returns the token the local route must expect
 */
export function publishConnection(userDataDir: string, url: string, manifest: McpManifest): string {
  const file = path.join(userDataDir, MCP_CONNECTION_FILE);
  const token = previousToken(file) ?? randomBytes(32).toString('hex');
  const connection: McpConnection = { url, token, manifest, updatedAt: new Date().toISOString() };
  fs.writeFileSync(file, JSON.stringify(connection, null, 2), { encoding: 'utf-8', mode: 0o600 });
  return token;
}
