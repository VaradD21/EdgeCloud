const { ipcMain } = require('electron');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const API_URL = 'http://localhost:8000';

function registerDeployIpc() {
  ipcMain.handle('buyer:createDeployment', async (event, token, listingId, peerpkgPath, envVars) => {
    try {
      // 1. Upload peerpkg
      const formData = new FormData();
      formData.append('file', fs.createReadStream(peerpkgPath));
      
      const uploadResp = await axios.post(`${API_URL}/deployments/upload`, formData, {
        headers: { 
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`
        }
      });
      const packageUrl = uploadResp.data.package_url;

      // 2. Create Deployment record
      const appName = path.parse(peerpkgPath).name;
      const deployResp = await axios.post(`${API_URL}/deployments`, {
        listing_id: listingId,
        name: appName,
        docker_image: packageUrl // Using this field for the URL
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return { success: true, data: deployResp.data };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });

  ipcMain.handle('buyer:getMyDeployments', async (event, token) => {
    try {
      const response = await axios.get(`${API_URL}/deployments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.message };
    }
  });
}

module.exports = { registerDeployIpc };
