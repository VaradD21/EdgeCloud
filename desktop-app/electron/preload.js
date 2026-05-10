const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edgecloud', {
    getStatus: () => ipcRenderer.invoke('agent:getStatus'),
    register: (data) => ipcRenderer.invoke('agent:register', data),
    startAgent: () => ipcRenderer.invoke('agent:start'),
    stopAgent: () => ipcRenderer.invoke('agent:stop')
});
