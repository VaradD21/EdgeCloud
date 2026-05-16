const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  startWorkload: (payload) => ipcRenderer.invoke('start-workload', payload),
  stopWorkload: (jobId) => ipcRenderer.invoke('stop-workload', jobId),
  onLog: (callback) => ipcRenderer.on('workload-log', (_event, value) => callback(value)),
  onStats: (callback) => ipcRenderer.on('workload-stats', (_event, value) => callback(value))
});
