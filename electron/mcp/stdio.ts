import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { MCP_CONNECTION_FILE, MCP_STDIO_FLAG } from '../../shared/mcp.types';
import { runBridge } from '../../mcp-bridge/bridge';

/** Claude starts the app with this flag when Node.js is not installed: no window, only the bridge to the open app. */
export const isMcpStdioLaunch = () => process.argv.includes(MCP_STDIO_FLAG);

// stdout carries the protocol: this module is imported first, so the app's modules cannot log there while they load
if (isMcpStdioLaunch()) {
  console.log = console.info = console.warn = console.debug = console.error;
  // Chromium's caches must not be shared with the open app
  app.setPath('sessionData', path.join(app.getPath('temp'), 'cv-maker-mcp-bridge'));
}

export function runAsMcpBridge(): void {
  app.disableHardwareAcceleration();
  app.dock?.hide();
  // Electron does not wire process.stdin to a pipe on Windows
  const input = fs.createReadStream('', { fd: 0, autoClose: false });
  runBridge(process.env.CVMAKER_MCP_FILE ?? path.join(app.getPath('userData'), MCP_CONNECTION_FILE), input);
}
