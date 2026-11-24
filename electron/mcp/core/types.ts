import type { McpPromptArgument, McpToolAnnotations } from '../../../shared/mcp.types';
import type { Args } from './args';
import type { CallContext } from './context';

export type JsonSchema = Record<string, unknown>;

/** `run` answers compact text, not JSON: every character costs the client tokens. */
export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: McpToolAnnotations;
  run: (args: Args, ctx: CallContext) => Promise<string>;
}

/** Sent back to the model as a tool error it can act on. */
export class ToolError extends Error {}

/** A ready-made task the user picks in the client (a slash command in Claude Code); `render` gets its arguments. */
export interface PromptDef {
  name: string;
  title: string;
  description: string;
  arguments: McpPromptArgument[];
  render: (args: Record<string, string>) => string;
}
