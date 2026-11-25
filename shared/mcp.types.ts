/**
 * Contract between the app and the MCP bridge (mcp-bridge/), the small process an MCP client such as Claude Desktop
 * or Claude Code starts. The app writes MCP_CONNECTION_FILE in its user data folder at launch; the bridge reads it to
 * list the tools (even while the app is closed) and to reach the local server with its token.
 */

/** File in the Electron userData folder. */
export const MCP_CONNECTION_FILE = 'mcp.json';
/** Electron userData folder name (package.json "name"), for the bridge to find the file without Electron. */
export const MCP_APP_DIR = 'cv-maker';
/** Bumped when the bridge and the app stop understanding each other. */
export const MCP_CONTRACT_VERSION = 1;

/** Hints shown to the MCP client, as in the MCP specification. */
export interface McpToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface McpToolManifest {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: McpToolAnnotations;
}

export interface McpPromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

export interface McpPromptManifest {
  name: string;
  title: string;
  description: string;
  arguments: McpPromptArgument[];
}

export interface McpManifest {
  version: number;
  instructions: string;
  tools: McpToolManifest[];
  prompts: McpPromptManifest[];
}

/** Content of MCP_CONNECTION_FILE. */
export interface McpConnection {
  /** Local server base URL, e.g. http://127.0.0.1:9123 */
  url: string;
  /** Bearer token the bridge sends on every call. */
  token: string;
  manifest: McpManifest;
  updatedAt: string;
}

/** POST /api/mcp/call body and answer. */
export interface McpCallRequest {
  name: string;
  arguments?: Record<string, unknown>;
}
export interface McpCallResult {
  text: string;
  isError: boolean;
}

/** POST /api/mcp/prompt body and answer. */
export interface McpPromptRequest {
  name: string;
  arguments?: Record<string, string>;
}
export interface McpPromptResult {
  description: string;
  text: string;
}

/**
 * What an AI assistant connected through MCP may read from the app or write into it, as the user sets it in
 * Settings → Claude. The browser extension is part of the app: its routes never depend on these.
 */
export const MCP_PERMISSIONS = [
  { id: 'profile_read', area: 'Profile', direction: 'read', description: 'Experiences, projects, skills and education. Never contact details or the photo.' },
  { id: 'applications_read', area: 'Applications', direction: 'read', description: 'Your applications, their timeline and your pipeline stats.' },
  { id: 'applications_write', area: 'Applications', direction: 'write', description: 'Log status changes, interviews and notes, record applications you sent.' },
  { id: 'opportunities_read', area: 'Job offers', direction: 'read', description: 'The Opportunities queue and offer analysis.' },
  { id: 'opportunities_write', area: 'Job offers', direction: 'write', description: 'Add offers to the queue, shortlist or dismiss them.' },
  { id: 'resumes_write', area: 'Resumes', direction: 'write', description: 'Draft tailored resumes, saved in AI Review for you to check.' },
  { id: 'interview_read', area: 'Interview prep', direction: 'read', description: 'Your interview questions and prepared answers.' },
  { id: 'interview_write', area: 'Interview prep', direction: 'write', description: 'Save questions and answers to your library.' },
  { id: 'form_answers_read', area: 'Form answers', direction: 'read', description: 'Answers saved from application forms (salary expectation, work permit...). Contact details always stay out.' },
] as const;

export type McpPermissionId = (typeof MCP_PERMISSIONS)[number]['id'];
export type McpPermissions = Record<McpPermissionId, boolean>;

export const allMcpPermissions = (allowed: boolean): McpPermissions =>
  Object.fromEntries(MCP_PERMISSIONS.map(({ id }) => [id, allowed])) as McpPermissions;

/** What Settings → Claude shows. */
export interface McpStatus {
  permissions: McpPermissions;
  /** False when the bridge file is missing (a dev build without `npm run build:mcp`). */
  bridgeReady: boolean;
  /** Node.js the bridge runs with, null when none was found. */
  node: { path: string; version: string } | null;
  claudeDesktop: {
    /** Its settings folder exists on this computer. */
    installed: boolean;
    connected: boolean;
    configPath: string | null;
  };
  /** Ready to paste in a terminal, null without Node or bridge. */
  claudeCodeCommand: string | null;
}

export type McpConnectResult = { ok: true; status: McpStatus } | { ok: false; error: string };
