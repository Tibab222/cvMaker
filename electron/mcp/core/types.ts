import { MCP_PERMISSIONS, type McpPermissionId, type McpPromptArgument, type McpToolAnnotations } from '../../../shared/mcp.types';
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
  /** All needed: the tool is hidden and refused while the user turns one off. */
  permissions: McpPermissionId[];
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
  /** Listed only while the user allows all of these. */
  permissions: McpPermissionId[];
  render: (args: Record<string, string>) => string;
}

export function turnedOff(permission: McpPermissionId): string {
  const { area, direction } = MCP_PERMISSIONS.find(({ id }) => id === permission)!;
  return `The user turned off "${area} · ${direction}" for AI assistants in CV Maker (Settings → Claude). Ask them to turn it on if they want this.`;
}
