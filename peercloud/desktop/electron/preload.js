const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('peercloud', {
  // Auth
  login: (email, password) => ipcRenderer.invoke('auth:login', email, password),
  register: (email, password, role) => ipcRenderer.invoke('auth:register', email, password, role),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Hardware
  getHardwareInfo: () => ipcRenderer.invoke('hardware:getInfo'),
  saveResourceConfig: (config) => ipcRenderer.invoke('host:saveResourceConfig', config),
  getResourceConfig: () => ipcRenderer.invoke('host:getResourceConfig'),

  // Host Node
  registerNode: (token, displayName, cpu, ram, disk) => ipcRenderer.invoke('host:registerNode', token, displayName, cpu, ram, disk),
  getEarnings: (token) => ipcRenderer.invoke('host:getEarnings', token),

  // Workloads
  getRunningWorkloads: () => ipcRenderer.invoke('host:getRunningWorkloads'),
  stopWorkload: (id) => ipcRenderer.invoke('host:stopWorkload', id),
  onWorkloadUpdate: (callback) => {
    ipcRenderer.removeAllListeners('workload:update');
    ipcRenderer.on('workload:update', (event, data) => callback(data));
  },

  // Marketplace
  getListings: (token, filters) => ipcRenderer.invoke('buyer:getListings', token, filters),

  // Deployments
  createDeployment: (token, listingId, peerpkgPath, envVars) => ipcRenderer.invoke('buyer:createDeployment', token, listingId, peerpkgPath, envVars),
  getMyDeployments: (token) => ipcRenderer.invoke('buyer:getMyDeployments', token),
  getDeploymentLogs: (token, deploymentId) => ipcRenderer.invoke('buyer:getDeploymentLogs', token, deploymentId),
  getDeploymentStats: (token, deploymentId) => ipcRenderer.invoke('buyer:getDeploymentStats', token, deploymentId),
  stopDeployment: (token, deploymentId) => ipcRenderer.invoke('buyer:stopDeployment', token, deploymentId),
  
  onDeploymentLog: (callback) => {
    ipcRenderer.removeAllListeners('workload:log');
    ipcRenderer.on('workload:log', (event, data) => callback(data));
  },

  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options)
});
