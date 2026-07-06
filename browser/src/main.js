const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('node:path');

// Known benign Electron race with <webview> navigation: a render frame can be
// disposed before Electron reads its info. Swallow it instead of popping a crash dialog.
process.on('uncaughtException', (err) => {
  const msg = err && err.message ? err.message : String(err);
  if (msg.includes('Render frame was disposed') || msg.includes('WebFrameMain')) return;
  console.error('[main] uncaughtException:', err);
});

// Minimal tracker/ad blocklist (prototype). A real build uses a maintained list
// like EasyList. This already makes the browser meaningfully more private.
const BLOCKED_HOSTS = [
  'doubleclick.net',
  'googlesyndication.com',
  'google-analytics.com',
  'googletagmanager.com',
  'adservice.google.com',
  'connect.facebook.net',
  'facebook.net',
  'ads-twitter.com',
  'analytics.tiktok.com',
  'scorecardresearch.com',
  'adnxs.com',
  'criteo.com',
  'taboola.com',
  'outbrain.com',
  'hotjar.com',
  'mixpanel.com',
];

let blockerEnabled = true;
let blockedCount = 0;
let vpnOn = false;
let mainWindow = null;

function isBlocked(url) {
  try {
    const host = new URL(url).hostname;
    return BLOCKED_HOSTS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

function installBlocker(ses) {
  ses.webRequest.onBeforeRequest((details, callback) => {
    if (blockerEnabled && isBlocked(details.url)) {
      blockedCount += 1;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('privacy:blocked', blockedCount);
      }
      return callback({ cancel: true });
    }
    callback({});
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#06070a',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
}

app.whenReady().then(() => {
  installBlocker(session.defaultSession);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('app:versions', () => ({
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
}));

ipcMain.handle('privacy:toggleBlocker', (_event, on) => {
  blockerEnabled = Boolean(on);
  return blockerEnabled;
});

ipcMain.handle('vpn:toggle', (_event, on) => {
  vpnOn = Boolean(on);
  // PROTOTYPE: this only flips a flag. Real integration brings up/down the
  // system WireGuard tunnel (the unknown0 VPN) — see browser/README.md.
  return vpnOn;
});
