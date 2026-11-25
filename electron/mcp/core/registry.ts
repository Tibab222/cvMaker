import { MCP_CONTRACT_VERSION, type McpCallResult, type McpManifest, type McpPermissionId, type McpPromptResult } from '../../../shared/mcp.types';
import { Args } from './args';
import { CallContext } from './context';
import type { McpDeps } from './deps';
import { ToolError, turnedOff, type PromptDef, type ToolDef } from './types';

/** Safety net: tools are meant to stay far below it. */
const MAX_ANSWER_CHARS = 24_000;
/** A pasted offer is the longest argument. */
const MAX_PROMPT_ARGUMENT_CHARS = 30_000;

export class McpRegistry {
  private readonly tools = new Map<string, ToolDef>();
  private readonly prompts = new Map<string, PromptDef>();

  constructor(private readonly deps: McpDeps, private readonly instructions: string, tools: ToolDef[], prompts: PromptDef[] = []) {
    for (const tool of tools) {
      if (this.tools.has(tool.name)) throw new Error(`[MCP] Duplicate tool name: ${tool.name}`);
      this.tools.set(tool.name, tool);
    }
    for (const prompt of prompts) {
      if (this.prompts.has(prompt.name)) throw new Error(`[MCP] Duplicate prompt name: ${prompt.name}`);
      this.prompts.set(prompt.name, prompt);
    }
  }

  /** The first permission of `needed` the user turned off, if any. */
  private blocked(needed: McpPermissionId[]): McpPermissionId | undefined {
    const permissions = this.deps.permissions();
    return needed.find((permission) => !permissions[permission]);
  }

  /** Only what the user allows: a tool turned off is not even described to the client. */
  manifest(): McpManifest {
    return {
      version: MCP_CONTRACT_VERSION,
      instructions: this.instructions,
      tools: [...this.tools.values()].filter((tool) => !this.blocked(tool.permissions)).map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })),
      prompts: [...this.prompts.values()].filter((prompt) => !this.blocked(prompt.permissions)).map(({ name, title, description, arguments: args }) => ({ name, title, description, arguments: args })),
    };
  }

  /** Throws a ToolError for an unknown prompt or a missing argument: the client shows it to the user. */
  prompt(name: string, rawArgs: unknown): McpPromptResult {
    const prompt = this.prompts.get(name);
    if (!prompt) throw new ToolError(`Unknown prompt "${name}".`);
    const off = this.blocked(prompt.permissions);
    if (off) throw new ToolError(turnedOff(off));
    const given = rawArgs && typeof rawArgs === 'object' ? (rawArgs as Record<string, unknown>) : {};
    const args: Record<string, string> = {};
    for (const { name: argName, required } of prompt.arguments) {
      const value = typeof given[argName] === 'string' ? (given[argName] as string).trim().slice(0, MAX_PROMPT_ARGUMENT_CHARS) : '';
      if (required && !value) throw new ToolError(`"${argName}" is required for ${name}.`);
      if (value) args[argName] = value;
    }
    return { description: prompt.description, text: prompt.render(args) };
  }

  async call(name: string, rawArgs: unknown): Promise<McpCallResult> {
    const tool = this.tools.get(name);
    if (!tool) return { text: `Unknown tool "${name}".`, isError: true };
    const off = this.blocked(tool.permissions);
    if (off) return { text: turnedOff(off), isError: true };
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
