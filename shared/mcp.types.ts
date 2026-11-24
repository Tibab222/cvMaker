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
