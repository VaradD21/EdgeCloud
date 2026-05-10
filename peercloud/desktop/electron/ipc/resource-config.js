const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(app.getPath('userData'), 'PeerCloud');
const RESOURCE_CONFIG_PATH = path.join(CONFIG_DIR, 'resource_config.json');

function registerResourceConfigIpc() {
  ipcMain.handle('host:saveResourceConfig', (event, config) => {
    try {
      if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(RESOURCE_CONFIG_PATH, JSON.stringify(config, null, 2));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('host:getResourceConfig', () => {
    try {
      if (fs.existsSync(RESOURCE_CONFIG_PATH)) {
        const data = fs.readFileSync(RESOURCE_CONFIG_PATH, 'utf8');
        return { success: true, data: JSON.parse(data) };
      }
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerResourceConfigIpc, RESOURCE_CONFIG_PATH };
