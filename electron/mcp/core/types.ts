import type { McpToolAnnotations } from '../../../shared/mcp.types';
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
