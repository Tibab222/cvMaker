import { app, BrowserWindow, protocol, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers } from './ipcHandlers';
import { existsSync, mkdirSync } from 'fs';
import { HttpServerService } from './services/HttpServer/HttpServerService';
import { getDiscoveryManager } from './services/discovery';
import { ProfileService } from './services/ProfileService';
import { BROWSER_SOURCE, JobApplicationManager } from './services/jobApplications/jobApplicationManager';
import { buildAutofillProfile } from './functions/autofillProfile';
import { getVaultManager } from './services/vault';
import { getAnswerBank } from './services/answers';
import { announceApplicationsChanged, recordSentApplication } from './functions/recordApplication';
import { handleSquirrelEvent } from './squirrelStartup';
import { startMcp } from './mcp';
import { createAppDeps } from './mcp/wiring';

// Windows installer launches (install, update, uninstall): make or remove the shortcuts, then quit
const squirrelEvent = handleSquirrelEvent();

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
  if (squirrelEvent) return;
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
    queueJob: (payload) => getDiscoveryManager().addSavedOffer(payload),
    openedOffers: () => getDiscoveryManager().openedOffers(),
    vault: {
      list: () => getVaultManager().list().map(({ id, name, file_name, pages, language, has_text, keywords }) => ({
        id, name, file_name, pages, language, has_text, keywords: keywords.slice(0, 8),
      })),
      match: (offer, limit) => getVaultManager().match(offer, limit),
      file: (id) => getVaultManager().readFile(id),
    },
    recordApplication: async (dto) => {
      const result = await recordSentApplication(dto, BROWSER_SOURCE);
      announceApplicationsChanged({ source: 'extension', action: result.action, title: result.application.job_title, company: result.application.company_name, fromOffer: !!result.offer });
      return result;
    },
    answers: {
      capture: (answers) => getAnswerBank().capture(answers),
      match: (questions) => getAnswerBank().match(questions),
    },
    mcp: startMcp({ userDataDir: app.getPath('userData'), serverUrl: HttpServerService.getInstance().url, deps: createAppDeps() }),
  });
  // daily job search; it only runs while the app is open (a missed run happens at the next launch)
  getDiscoveryManager().startScheduler();
});

app.on('before-quit', () => {
  if (squirrelEvent) return;
  getDiscoveryManager().stopScheduler();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});