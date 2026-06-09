import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import log from 'electron-log/main.js';
import { registerIpcHandlers } from './ipc/registerHandlers.js';
import { initDatabase, closeDatabase } from './database/db.js';
import { runtimeRegistry } from './modules/runtime/registry.js';
import { backupScheduler } from './modules/backups/scheduler.js';
import { appPaths } from './core/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b0b0d',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  return win;
}

async function bootstrap() {
  log.info('App boot →', { paths: appPaths() });
  await initDatabase();
  registerIpcHandlers();
  backupScheduler.start();
  mainWindow = createMainWindow();
}

app.whenReady().then(bootstrap).catch((err) => {
  log.error('Fatal during bootstrap', err);
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
});

app.on('before-quit', async () => {
  log.info('Shutting down…');
  backupScheduler.stop();
  await runtimeRegistry.shutdownAll();
  closeDatabase();
});

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
