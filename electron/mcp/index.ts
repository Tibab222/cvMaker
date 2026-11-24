import { publishConnection } from './connection';
import type { McpDeps } from './core/deps';
import { McpRegistry } from './core/registry';
import { createMcpRoute, type McpRoute } from './http';
import { MCP_INSTRUCTIONS } from './instructions';
import { MCP_TOOLS } from './tools';

export type { McpRoute } from './http';

export function createMcpRegistry(deps: McpDeps): McpRegistry {
  return new McpRegistry(deps, MCP_INSTRUCTIONS, MCP_TOOLS);
}

/** Publishes the connection file and returns the route the local server mounts under /api/mcp/. */
export function startMcp(options: { userDataDir: string; serverUrl: string; deps: McpDeps }): McpRoute | undefined {
  try {
    const registry = createMcpRegistry(options.deps);
    const token = publishConnection(options.userDataDir, options.serverUrl, registry.manifest());
    return createMcpRoute(registry, token, options.serverUrl);
  } catch (error) {
    // the app works without it
    console.error('[MCP] Not started:', error);
    return undefined;
  }
}
