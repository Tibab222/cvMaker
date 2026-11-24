import type { McpDeps } from './core/deps';
import { McpRegistry } from './core/registry';
import { MCP_INSTRUCTIONS } from './instructions';
import { MCP_TOOLS } from './tools';

export function createMcpRegistry(deps: McpDeps): McpRegistry {
  return new McpRegistry(deps, MCP_INSTRUCTIONS, MCP_TOOLS);
}
