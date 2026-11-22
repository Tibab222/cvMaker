import { app } from 'electron';
import { spawn } from 'child_process';
import path from 'path';

/**
 * The Windows installer (Squirrel) starts the app with a --squirrel-* flag when it installs, updates or
 * uninstalls it. Those launches add or remove the Start menu and desktop shortcuts, then quit.
 * Returns true for such a launch, so the rest of the startup (window, local server) is skipped.
 */
export function handleSquirrelEvent(): boolean {
  if (process.platform !== 'win32') return false;
  const flag = process.argv[1] ?? '';
  // --squirrel-firstrun is the normal launch right after the install
  if (!flag.startsWith('--squirrel-') || flag === '--squirrel-firstrun') return false;

  // Update.exe sits next to the app-<version> folder the app runs from
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  const target = path.basename(process.execPath);
  const runThenQuit = (args: string[]) => {
    // the installer waits for this launch to end, so the shortcuts are done before it carries on
    const child = spawn(updateExe, args, { detached: true, stdio: 'ignore' });
    child.on('close', () => app.quit());
    child.on('error', () => app.quit());
  };

  if (flag === '--squirrel-install' || flag === '--squirrel-updated') runThenQuit([`--createShortcut=${target}`]);
  else if (flag === '--squirrel-uninstall') runThenQuit([`--removeShortcut=${target}`]);
  else app.quit(); // --squirrel-obsolete: an older version being replaced
  return true;
}
