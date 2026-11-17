import { app, BrowserWindow, protocol, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers } from './ipcHandlers';
import { existsSync, mkdirSync } from 'fs';
import { HttpServerService } from './services/HttpServer/HttpServerService';
import { getDiscoveryManager } from './services/discovery';
import { ProfileService } from './services/ProfileService';
import { JobApplicationManager } from './services/jobApplications/jobApplicationManager';
import { buildAutofillProfile } from './functions/autofillProfile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let win: BrowserWindow | null = null;

export const downloadFolder = path.join(app.getPath('userData'), 'downloads');
export const profilesDir = path.join(app.getPath("userData"), "profiles")
if (!existsSync(profilesDir)) {
    mkdirSync(profilesDir, { recursive: true });
}
if (!existsSync(downloadFolder)) {
    mkdirSync(downloadFolder, { recursive: true });
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'cvmaker',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      bypassCSP: true
    }
  }, {
    scheme: 'datasource',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      bypassCSP: true
    }
  }
])

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets/logo.png')
    : path.join(__dirname, '../assets/logo.png');

  win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  // win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  HttpServerService.getInstance().init(() => win, {
    getStatus: () => {
      const profilePath = ProfileService.getInstance().getCurrentProfilePath();
      return {
        app: 'cvmaker',
        profileLoaded: JobApplicationManager.getInstance().isConnected(),
        profileName: profilePath ? path.basename(profilePath) : null,
      };
    },
    getAutofillProfile: async () => {
      const data = await ProfileService.getInstance().getCurrentProfile();
      return data ? buildAutofillProfile(data) : null;
    },
    queueJob: (payload) => getDiscoveryManager().addFromExtension(payload),
  });
  // daily job search; it only runs while the app is open (a missed run happens at the next launch)
  getDiscoveryManager().startScheduler();
});

app.on('before-quit', () => {
  getDiscoveryManager().stopScheduler();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});