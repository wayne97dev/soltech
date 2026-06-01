const { contextBridge, ipcRenderer } = require('electron');

// Safe, minimal bridge exposed to the browser UI (renderer).
contextBridge.exposeInMainWorld('unknown0', {
  versions: () => ipcRenderer.invoke('app:versions'),
  toggleBlocker: (on) => ipcRenderer.invoke('privacy:toggleBlocker', on),
  toggleVpn: (on) => ipcRenderer.invoke('vpn:toggle', on),
  onBlocked: (cb) => ipcRenderer.on('privacy:blocked', (_event, n) => cb(n)),
});
