import { BrowserWindow } from "electron";

/** Main -> every open window. */
export function broadcast(channel: string, payload?: unknown): void {
    BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) window.webContents.send(channel, payload);
    });
}
