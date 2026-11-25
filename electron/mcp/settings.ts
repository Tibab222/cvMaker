import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { app } from 'electron';
import {
  allMcpPermissions, MCP_CONNECTION_FILE, MCP_PERMISSIONS, MCP_STDIO_FLAG,
  type McpConnectResult, type McpPermissions, type McpStatus,
} from '../../shared/mcp.types';
import { ConfigurationManager } from '../services/config/ConfigurationManager';

const SERVER_NAME = 'cvmaker';
const BRIDGE_FILE = 'cvmaker-mcp.mjs';
const MIN_NODE = 20;
const run = promisify(execFile);

/** Everything is allowed until the user turns something off. */
export function mcpPermissions(): McpPermissions {
  return { ...allMcpPermissions(true), ...ConfigurationManager.getInstance().get('mcpPermissions') };
}

export function saveMcpPermissions(changes: unknown): McpPermissions {
  const next = mcpPermissions();
  if (changes && typeof changes === 'object') {
    for (const { id } of MCP_PERMISSIONS) {
      const value = (changes as Record<string, unknown>)[id];
      if (typeof value === 'boolean') next[id] = value;
    }
  }
  ConfigurationManager.getInstance().updateConfig({ mcpPermissions: next });
  return next;
}

// The installed app's folder changes with each version, so MCP clients run a copy that stays in place.
const installedBridge = () => path.join(app.getPath('userData'), 'mcp', BRIDGE_FILE);
const bundledBridge = () =>
  path.join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'dist-mcp', BRIDGE_FILE);

function installBridge(): string | null {
  const target = installedBridge();
  try {
    const source = fs.readFileSync(bundledBridge());
    if (!fs.existsSync(target) || !source.equals(fs.readFileSync(target))) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, source);
    }
  } catch (error) {
    console.error('[MCP] Bridge not installed:', error);
  }
  return fs.existsSync(target) ? target : null;
}

// Apps started from the Dock do not get the shell's PATH on macOS.
const NODE_CANDIDATES = process.platform === 'win32' ? ['node'] : ['node', '/opt/homebrew/bin/node', '/usr/local/bin/node', '/usr/bin/node'];
let foundNode: { path: string; version: string } | null = null;

async function findNode(): Promise<typeof foundNode> {
  if (foundNode) return foundNode;
  for (const candidate of NODE_CANDIDATES) {
    try {
      const { stdout } = await run(candidate, ['-p', 'process.execPath + "|" + process.versions.node'], { timeout: 5000, windowsHide: true });
      const [execPath, version] = stdout.trim().split('|');
      if (Number(version.split('.')[0]) >= MIN_NODE) return (foundNode = { path: execPath, version });
    } catch {
      // not there, try the next one
    }
  }
  return null;
}

function claudeConfigCandidates(): string[] {
  const classic = path.join(app.getPath('appData'), 'Claude', 'claude_desktop_config.json');
  if (process.platform !== 'win32') return [classic];
  const local = process.env.LOCALAPPDATA ?? path.join(app.getPath('home'), 'AppData', 'Local');
  const under = (dir: string, ...rest: string[]) => {
    try {
      return fs.readdirSync(dir).filter((name) => name.toLowerCase().startsWith('claude_')).map((name) => path.join(dir, name, ...rest));
    } catch {
      return [];
    }
  };
  // recent Windows versions keep their data out of %APPDATA% (which may only hold leftovers)
  return [
    ...under(path.join(local, 'Claude-Data'), 'claude_desktop_config.json'),
    ...under(path.join(local, 'Packages'), 'LocalCache', 'Roaming', 'Claude', 'claude_desktop_config.json'),
    classic,
  ];
}

/** The file Claude Desktop reads: the first that exists, else one in the first folder Claude made. */
function claudeConfigPath(): string | null {
  const candidates = claudeConfigCandidates();
  return candidates.find((file) => fs.existsSync(file)) ?? candidates.find((file) => fs.existsSync(path.dirname(file))) ?? null;
}

type ClaudeConfig = Record<string, unknown> & { mcpServers?: Record<string, unknown> };

function readClaudeConfig(file: string): ClaudeConfig {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf-8');
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw; // BOM left by Notepad
  if (!text.trim()) return {};
  const config = JSON.parse(text) as unknown;
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('not a JSON object');
  return config as ClaudeConfig;
}

function writeClaudeConfig(file: string, config: ClaudeConfig): void {
  const backup = `${file}.before-cvmaker`;
  if (fs.existsSync(file) && !fs.existsSync(backup)) fs.copyFileSync(file, backup);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(config, null, 2), 'utf-8');
  fs.renameSync(temp, file);
}

interface Launcher {
  command: string;
  args: string[];
  runner: McpStatus['runner'];
}

/** Node runs the bridge with less memory; without it, the app runs the bridge itself. */
async function launcher(): Promise<Launcher> {
  const node = await findNode();
  const bridge = node ? installBridge() : null;
  if (node && bridge) return { command: node.path, args: [bridge], runner: { kind: 'node', version: node.version } };
  // in development the app is electron.exe plus the project folder
  return { command: process.execPath, args: [...(app.isPackaged ? [] : [app.getAppPath()]), MCP_STDIO_FLAG], runner: { kind: 'app' } };
}

const serverEntry = ({ command, args }: Launcher) => ({
  command,
  args,
  // the Store version of Claude may not see %APPDATA% as it is
  env: { CVMAKER_MCP_FILE: path.join(app.getPath('userData'), MCP_CONNECTION_FILE) },
});

function connectedEntry(file: string | null): unknown {
  try {
    return file ? readClaudeConfig(file).mcpServers?.[SERVER_NAME] : undefined;
  } catch {
    return undefined;
  }
}

export async function mcpStatus(): Promise<McpStatus> {
  const launch = await launcher();
  const configPath = claudeConfigPath();
  return {
    permissions: mcpPermissions(),
    runner: launch.runner,
    claudeDesktop: { installed: !!configPath, connected: !!connectedEntry(configPath), configPath },
    claudeCodeCommand: `claude mcp add --scope user ${SERVER_NAME} -- ${[launch.command, ...launch.args].map((arg) => `"${arg}"`).join(' ')}`,
  };
}

async function editClaudeServers(edit: (servers: Record<string, unknown>) => Promise<void>): Promise<McpConnectResult> {
  const file = claudeConfigPath();
  if (!file) return { ok: false, error: 'Claude Desktop was not found on this computer. Install it from claude.ai/download and open it once.' };
  let config: ClaudeConfig;
  try {
    config = readClaudeConfig(file);
  } catch {
    return { ok: false, error: `Claude Desktop's settings file is not valid JSON, so CV Maker left it alone: ${file}` };
  }
  const servers = config.mcpServers && typeof config.mcpServers === 'object' ? { ...config.mcpServers } : {};
  await edit(servers);
  try {
    writeClaudeConfig(file, { ...config, mcpServers: servers });
  } catch (writeError) {
    return { ok: false, error: `Could not write ${file}: ${(writeError as Error).message}` };
  }
  return { ok: true, status: await mcpStatus() };
}

export function connectClaudeDesktop(): Promise<McpConnectResult> {
  return editClaudeServers(async (servers) => {
    servers[SERVER_NAME] = serverEntry(await launcher());
  });
}

export function disconnectClaudeDesktop(): Promise<McpConnectResult> {
  return editClaudeServers(async (servers) => {
    delete servers[SERVER_NAME];
  });
}

/** At launch: a new version, or Node installed or moved, must not break a connection made earlier. */
export async function setupMcpClients(): Promise<void> {
  installBridge();
  const entry = connectedEntry(claudeConfigPath());
  if (!entry || JSON.stringify(entry) === JSON.stringify(serverEntry(await launcher()))) return;
  const result = await connectClaudeDesktop();
  if (!result.ok) console.error('[MCP] Claude Desktop entry not refreshed:', result.error);
}
