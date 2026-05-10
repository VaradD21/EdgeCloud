const { ipcMain } = require('electron');
const axios = require('axios');

const API_URL = 'http://localhost:8000';

function registerAuthIpc() {
  ipcMain.handle('auth:login', async (event, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });

  ipcMain.handle('auth:register', async (event, email, password, role) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, { email, password, role });
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });

  ipcMain.handle('auth:me', async (event, token) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });
}

module.exports = { registerAuthIpc };
