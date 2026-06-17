const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mapleAlarm', {
  getState: () => ipcRenderer.invoke('state:get'),
  saveSlots: (slots) => ipcRenderer.invoke('slots:save', slots),
  pauseAll: () => ipcRenderer.invoke('timers:pause-all'),
  acknowledgeAlarm: (slotId) => ipcRenderer.invoke('timers:acknowledge', slotId),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('state:changed', listener);
    return () => ipcRenderer.removeListener('state:changed', listener);
  }
});
