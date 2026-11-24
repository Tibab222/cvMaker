import { MCP_CONTRACT_VERSION, type McpCallResult, type McpManifest } from '../../../shared/mcp.types';
import { Args } from './args';
import { CallContext } from './context';
import type { McpDeps } from './deps';
import { ToolError, type ToolDef } from './types';

/** Safety net: tools are meant to stay far below it. */
const MAX_ANSWER_CHARS = 24_000;

export class McpRegistry {
  private readonly tools = new Map<string, ToolDef>();

  constructor(private readonly deps: McpDeps, private readonly instructions: string, tools: ToolDef[]) {
    for (const tool of tools) {
      if (this.tools.has(tool.name)) throw new Error(`[MCP] Duplicate tool name: ${tool.name}`);
      this.tools.set(tool.name, tool);
    }
  }

  manifest(): McpManifest {
    return {
      version: MCP_CONTRACT_VERSION,
      instructions: this.instructions,
      tools: [...this.tools.values()].map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })),
      prompts: [],
    };
  }

  async call(name: string, rawArgs: unknown): Promise<McpCallResult> {
    const tool = this.tools.get(name);
    if (!tool) return { text: `Unknown tool "${name}".`, isError: true };
    try {
      const text = await tool.run(new Args(rawArgs), new CallContext(this.deps));
      return { text: text.length > MAX_ANSWER_CHARS ? `${text.slice(0, MAX_ANSWER_CHARS)}\n… [answer cut: narrow the request]` : text, isError: false };
    } catch (error) {
      if (error instanceof ToolError) return { text: error.message, isError: true };
      // business rules refuse with a readable message ("A note cannot be empty"): the model can act on it too
      console.error(`[MCP] Tool ${name} failed:`, error);
      return { text: `CV Maker could not do it: ${error instanceof Error ? error.message : String(error)}`, isError: true };
    }
  }
}
