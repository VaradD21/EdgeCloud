const { ipcMain } = require('electron');
const si = require('systeminformation');

function registerHardwareIpc() {
  ipcMain.handle('hardware:getInfo', async () => {
    try {
      const cpu = await si.cpu();
      const mem = await si.mem();
      const disk = await si.fsSize();
      
      const mainDrive = disk.length > 0 ? disk[0] : { size: 0, use: 0 };
      const freeDiskGb = Math.floor((mainDrive.size - mainDrive.use) / (1024 ** 3));
      
      return {
        success: true,
        data: {
          cpuModel: `${cpu.manufacturer} ${cpu.brand}`,
          cpuCores: cpu.cores,
          ramTotalGb: Math.floor(mem.total / (1024 ** 3)),
          diskFreeGb: freeDiskGb
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerHardwareIpc };
