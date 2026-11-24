/**
 * CV Maker MCP bridge: started by an MCP client (Claude Desktop, Claude Code...) over stdio, it forwards tool calls
 * to the running app on 127.0.0.1. No dependency: MCP over stdio is newline-delimited JSON-RPC 2.0.
 * stdout carries the protocol only; logs go to stderr.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { MCP_APP_DIR, MCP_CONNECTION_FILE, type McpCallResult, type McpConnection, type McpPromptResult } from '../shared/mcp.types';

const BRIDGE_VERSION = '0.1.0';
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const CALL_TIMEOUT_MS = 120_000; // the first search loads the local embedding model

type Id = string | number;
interface Message {
  jsonrpc: '2.0';
  id?: Id;
  method?: string;
  params?: Record<string, unknown>;
}

const NOT_STARTED = 'CV Maker has never been started on this computer, so its tools are unknown. Ask the user to open CV Maker once, then restart this MCP server.';
const NOT_RUNNING = 'CV Maker is not running. Ask the user to open CV Maker and load their profile, then retry.';

function userDataDir(): string {
  const home = os.homedir();
  const base = process.platform === 'win32' ? process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming')
    : process.platform === 'darwin' ? path.join(home, 'Library', 'Application Support')
    : process.env.XDG_CONFIG_HOME ?? path.join(home, '.config');
  return path.join(base, MCP_APP_DIR);
}

const connectionFile = process.env.CVMAKER_MCP_FILE ?? path.join(userDataDir(), MCP_CONNECTION_FILE);

// read on every request: the app rewrites it at each launch
function readConnection(): McpConnection | null {
  try {
    return JSON.parse(fs.readFileSync(connectionFile, 'utf-8')) as McpConnection;
  } catch {
    return null;
  }
}

function log(...values: unknown[]): void {
  console.error('[cvmaker-mcp]', ...values);
}

function write(message: object): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

class AppUnreachable extends Error {}

async function post<T>(route: string, body: object): Promise<T> {
  const connection = readConnection();
  if (!connection) throw new AppUnreachable(NOT_STARTED);
  let response: Response;
  try {
    response = await fetch(`${connection.url}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${connection.token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
  } catch (error) {
    log('App unreachable:', error instanceof Error ? error.message : error);
    throw new AppUnreachable(NOT_RUNNING);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`CV Maker answered ${response.status} ${detail}`.trim());
  }
  return (await response.json()) as T;
}

async function callTool(params: Record<string, unknown>): Promise<object> {
  try {
    const result = await post<McpCallResult>('/api/mcp/call', { name: params.name, arguments: params.arguments ?? {} });
    return { content: [{ type: 'text', text: result.text }], isError: result.isError };
  } catch (error) {
    return { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true };
  }
}

async function getPrompt(params: Record<string, unknown>): Promise<object> {
  const result = await post<McpPromptResult>('/api/mcp/prompt', { name: params.name, arguments: params.arguments ?? {} });
  return { description: result.description, messages: [{ role: 'user', content: { type: 'text', text: result.text } }] };
}

async function handle(message: Message): Promise<object | undefined> {
  const params = message.params ?? {};
  switch (message.method) {
    case 'initialize': {
      const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
      const manifest = readConnection()?.manifest;
      return {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
        serverInfo: { name: 'cvmaker', title: 'CV Maker', version: BRIDGE_VERSION },
        instructions: manifest?.instructions ?? NOT_STARTED,
      };
    }
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: readConnection()?.manifest.tools ?? [] };
    case 'tools/call':
      return callTool(params);
    case 'prompts/list':
      return { prompts: readConnection()?.manifest.prompts ?? [] };
    case 'prompts/get':
      return getPrompt(params);
    default:
      throw Object.assign(new Error(`Method not found: ${message.method}`), { code: -32601 });
  }
}

async function onLine(line: string): Promise<void> {
  if (!line.trim()) return;
  let message: Message;
  try {
    message = JSON.parse(line) as Message;
  } catch {
    write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  // notifications (initialized, cancelled...) need no answer
  if (message.id === undefined) return;
  try {
    write({ jsonrpc: '2.0', id: message.id, result: await handle(message) });
  } catch (error) {
    const code = (error as { code?: number }).code ?? -32603;
    write({ jsonrpc: '2.0', id: message.id, error: { code, message: error instanceof Error ? error.message : String(error) } });
  }
}

log(`started, connection file: ${connectionFile}`);
readline.createInterface({ input: process.stdin }).on('line', (line) => void onLine(line));
