import { publishConnection } from './connection';
import type { McpDeps } from './core/deps';
import { McpRegistry } from './core/registry';
import { createMcpRoute, type McpRoute } from './http';
import { MCP_INSTRUCTIONS } from './instructions';
import { MCP_PROMPTS } from './prompts';
import { MCP_TOOLS } from './tools';

export type { McpRoute } from './http';
export { connectClaudeDesktop, disconnectClaudeDesktop, mcpStatus, saveMcpPermissions, setupMcpClients } from './settings';

let published: { registry: McpRegistry; userDataDir: string; serverUrl: string } | null = null;

export function createMcpRegistry(deps: McpDeps): McpRegistry {
  return new McpRegistry(deps, MCP_INSTRUCTIONS, MCP_TOOLS, MCP_PROMPTS);
}

/** Publishes the connection file and returns the route the local server mounts under /api/mcp/. */
export function startMcp(options: { userDataDir: string; serverUrl: string; deps: McpDeps }): McpRoute | undefined {
  try {
    const registry = createMcpRegistry(options.deps);
    const token = publishConnection(options.userDataDir, options.serverUrl, registry.manifest());
    published = { registry, userDataDir: options.userDataDir, serverUrl: options.serverUrl };
    return createMcpRoute(registry, token, options.serverUrl);
  } catch (error) {
    // the app works without it
    console.error('[MCP] Not started:', error);
    return undefined;
  }
}

/** Rewrites the tool list the bridge serves, once the user changed what assistants may use. */
export function refreshMcp(): void {
  if (published) publishConnection(published.userDataDir, published.serverUrl, published.registry.manifest());
}
