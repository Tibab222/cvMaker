import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIpcHandlers } from './ipcHandlers';
import { existsSync, mkdirSync } from 'fs';
import { LocalkeywordsExtractor } from './services/KeywordsExtractor/localKeywordsExtract';
import { Language } from '../shared/profile.interface';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: delete that
const mandate = `
Chez Sys-Thèmes, un développeur ne fait pas que coder. Tu auras l’occasion d’élargir tes compétences dans plusieurs domaines liés à la réalité des PME québécoises :
• gestion d’entreprise et processus opérationnels
• comptabilité et ressources humaines
• analyse fonctionnelle
• API et intégrations
• bases de données et environnement cloud
• relation directe avec les clients et fournisseurs
• formation et accompagnement

Nous valorisons la créativité, l’initiative et les idées nouvelles. Tu participeras à l’analyse des besoins clients, autant dans nos bureaux, chez les clients que parfois à distance.

L’entreprise fonctionne en méthodologie Agile, avec des rencontres d’équipe hebdomadaires pour faire avancer concrètement les projets.

Principales responsabilitésDéveloppement d’applications web (Java, HTML5, JavaScript, CSS3, jQuery)
• Intégration de nouveaux modules
• Maintenance et mise à niveau des applications existantes
• Optimisation du code et des bases de données
• Support technique et résolution de problèmes

Exigences
• Français requis (anglais : atout)
• DEC en informatique ou expérience équivalente
• Permis de conduire valide (déplacements occasionnels chez les clients)
• Java
• SQL
• HTML5, CSS3
• JavaScript, jQuery
• JSON, XML
• Bon sens de l’organisation et de l’initiative
`
LocalkeywordsExtractor.extractKeywords(mandate, Language.FRENCH);

export const profilesDir = path.join(app.getPath("userData"), "profiles")
if (!existsSync(profilesDir)) {
    mkdirSync(profilesDir, { recursive: true });
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
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  // win.setMenuBarVisibility(false);
}

// app.whenReady().then(() => {
//   registerIpcHandlers();
//   createWindow();
// });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});