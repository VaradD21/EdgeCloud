const { ipcMain } = require('electron');
const axios = require('axios');

const API_URL = 'http://localhost:8000';

function registerMarketplaceIpc() {
  ipcMain.handle('buyer:getListings', async (event, token, filters) => {
    try {
      const params = new URLSearchParams();
      if (filters?.minCpu) params.append('min_cpu', filters.minCpu);
      if (filters?.minRam) params.append('min_ram', filters.minRam);
      if (filters?.maxPrice) params.append('max_price', filters.maxPrice);

      const response = await axios.get(`${API_URL}/listings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });
}

module.exports = { registerMarketplaceIpc };
