const { ipcMain } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const API_URL = 'http://localhost:8000';
const CONFIG_DIR = path.join(app.getPath('userData'), 'PeerCloud');
const CONFIG_PATH = path.join(CONFIG_DIR, 'node_config.json');

function registerNodeRegistrationIpc() {
  ipcMain.handle('host:registerNode', async (event, token, displayName, cpuTotal, ramTotal, storageTotalGb) => {
    try {
      // First ensure host profile exists or create it
      try {
        await axios.get(`${API_URL}/hosts/me`, { headers: { Authorization: `Bearer ${token}` } });
      } catch (e) {
        if (e.response?.status === 404) {
          await axios.post(`${API_URL}/hosts/register`, { display_name: displayName }, { headers: { Authorization: `Bearer ${token}` } });
        } else {
          throw e;
        }
      }

      const response = await axios.post(`${API_URL}/nodes/register`, {
        name: displayName + "_Node",
        cpu_total: cpuTotal,
        ram_total: ramTotal,
        storage_total_gb: storageTotalGb
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Save node secret locally
      if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({
        node_id: response.data.id,
        node_secret: response.data.node_secret
      }));

      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });

  ipcMain.handle('host:getEarnings', async (event, token) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      return { success: true, data: { credits: response.data.credit_balance || 0 } };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });
}

module.exports = { registerNodeRegistrationIpc, CONFIG_PATH };
