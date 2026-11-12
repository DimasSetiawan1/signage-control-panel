const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getEnvConfig: () => ipcRenderer.invoke('get-env-config'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  clearConfig: () => ipcRenderer.invoke('clear-config'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
});

