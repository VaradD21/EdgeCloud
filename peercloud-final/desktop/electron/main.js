const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const pcrSandbox = require('./pcr/sandbox');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load Vite dev server in development, else load built index.html
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../public/icon.png')); // Ensure icon exists
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('PeerCloud Node');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  // createTray(); // Uncomment when icon exists

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-system-info', async () => {
  const si = require('systeminformation');
  const cpu = await si.cpu();
  const mem = await si.mem();
  const disk = await si.fsSize();
  return {
    cpu: { cores: cpu.cores, brand: cpu.brand },
    ram: { totalGB: Math.round(mem.total / 1e9) },
    disk: { totalGB: Math.round(disk[0].size / 1e9) }
  };
});

ipcMain.handle('start-workload', async (event, payload) => {
  return pcrSandbox.startWorkload(payload);
});

ipcMain.handle('stop-workload', async (event, jobId) => {
  return pcrSandbox.stopWorkload(jobId);
});
