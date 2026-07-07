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

// unknown0 VPN for the browser: route the app's traffic through a SOCKS5 proxy on our
// server — per-app, like Tor Browser (hides your IP for browsing without touching the
// rest of the system). Prototype: shared credentials; a real build issues them per holder.
// HTTP proxy (not SOCKS5 — Chromium can't authenticate SOCKS5 proxies).
const VPN_PROXY = 'http://144.91.104.144:8888';
const VPN_USER = 'unknown0';
const VPN_PASS = 'unknown0-beta';

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

// Supply the proxy credentials when the VPN proxy asks for authentication.
app.on('login', (event, _webContents, _request, authInfo, callback) => {
  if (authInfo && authInfo.isProxy) {
    event.preventDefault();
    callback(VPN_USER, VPN_PASS);
  }
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

ipcMain.handle('vpn:toggle', async (_event, on) => {
  vpnOn = Boolean(on);
  const ses = session.defaultSession;
  // Route (or stop routing) the whole app — including every tab's <webview> —
  // through the unknown0 server. Your browsing exits from the server's IP.
  if (vpnOn) {
    await ses.setProxy({ proxyRules: VPN_PROXY });
  } else {
    await ses.setProxy({ mode: 'direct' });
  }
  return vpnOn;
});
