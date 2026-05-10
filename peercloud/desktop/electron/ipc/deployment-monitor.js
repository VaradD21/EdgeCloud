const { ipcMain } = require('electron');
const axios = require('axios');

const API_URL = 'http://localhost:8000';

function registerDeploymentMonitorIpc() {
  ipcMain.handle('buyer:getDeploymentLogs', async (event, token, deploymentId) => {
    try {
      const response = await axios.get(`${API_URL}/deployments/${deploymentId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data.logs || [] };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });

  ipcMain.handle('buyer:getDeploymentStats', async (event, token, deploymentId) => {
    try {
      const response = await axios.get(`${API_URL}/deployments/${deploymentId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data.stats || [] };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });

  ipcMain.handle('buyer:stopDeployment', async (event, token, deploymentId) => {
    try {
      const response = await axios.post(`${API_URL}/deployments/${deploymentId}/stop`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });
}

module.exports = { registerDeploymentMonitorIpc };
