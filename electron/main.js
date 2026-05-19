import { app, BrowserWindow, Tray, Menu, globalShortcut, session, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import BLOCKED_DOMAINS from './adblock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIVE_URL = 'https://watchmovie-gamma.vercel.app';
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

// ─── Window State Persistence ────────────────────────────────────────
function loadWindowState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* ignore corrupt state */ }
  return { width: 1280, height: 720 };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  const isMaximized = win.isMaximized();
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...bounds, isMaximized }));
}

// ─── Main App ────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 800,
    minHeight: 600,
    title: 'WatchTV',
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    backgroundColor: '#0e0e16',
    show: false, // Don't show until ready (prevents white flash)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  // Restore maximized state
  if (state.isMaximized) mainWindow.maximize();

  // Show window once content is ready (smooth entry)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Load the live site
  mainWindow.loadURL(LIVE_URL);

  // Save window state on move/resize
  mainWindow.on('resize', () => saveWindowState(mainWindow));
  mainWindow.on('move', () => saveWindowState(mainWindow));
  mainWindow.on('maximize', () => saveWindowState(mainWindow));
  mainWindow.on('unmaximize', () => saveWindowState(mainWindow));

  // ─── Minimize to Tray on Close ───────────────────────────────────
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // ─── Block All Popups / New Windows ──────────────────────────────
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // ─── Navigation guard (stay on our site) ─────────────────────────
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const lUrl = url.toLowerCase();
    if (!url.startsWith(LIVE_URL) && 
        !lUrl.includes('vidking') && 
        !lUrl.includes('autoembed') && 
        !lUrl.includes('smashy.stream') && 
        !lUrl.includes('vidsrc') && 
        !lUrl.includes('vidapi')) {
      e.preventDefault();
    }
  });
}

// ─── System Tray ─────────────────────────────────────────────────────
function createTray() {
  // Create a simple 16x16 purple icon for the tray
  const iconPath = path.join(__dirname, 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('WatchTV — Premium Streaming');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🎬 Show WatchTV',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: '📌 Always on Top',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        mainWindow.setAlwaysOnTop(menuItem.checked);
      }
    },
    {
      label: '🔄 Reload',
      click: () => mainWindow.webContents.reload()
    },
    { type: 'separator' },
    {
      label: '❌ Quit WatchTV',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click tray icon to show window
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// ─── Keyboard Shortcuts ──────────────────────────────────────────────
function registerShortcuts() {
  // F11 — Toggle Fullscreen
  globalShortcut.register('F11', () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  // Escape — Exit Fullscreen
  globalShortcut.register('Escape', () => {
    if (mainWindow && mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
  });

  // Ctrl+R / F5 — Reload
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) mainWindow.webContents.reload();
  });
  globalShortcut.register('F5', () => {
    if (mainWindow) mainWindow.webContents.reload();
  });

  // Ctrl+Shift+I — DevTools
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });

  // Ctrl+T — Toggle Always on Top
  globalShortcut.register('CommandOrControl+T', () => {
    if (mainWindow) {
      const current = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!current);
    }
  });

  // Ctrl+M — Minimize to Tray
  globalShortcut.register('CommandOrControl+M', () => {
    if (mainWindow) mainWindow.hide();
  });
}

// ─── Ad Blocking (Network Interceptor) ───────────────────────────────
function setupAdBlocker() {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url.toLowerCase();
    const blocked = BLOCKED_DOMAINS.some(domain => url.includes(domain));
    if (blocked) {
      callback({ cancel: true });
    } else {
      callback({});
    }
  });
}

// ─── App Lifecycle ───────────────────────────────────────────────────
app.whenReady().then(() => {
  setupAdBlocker();
  createWindow();
  createTray();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit — we minimize to tray
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (mainWindow) saveWindowState(mainWindow);
  globalShortcut.unregisterAll();
});
