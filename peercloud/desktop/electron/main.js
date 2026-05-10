const { app, BrowserWindow, Tray, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { registerAllIpc } = require('./ipc/index');
const { startHeartbeat } = require('./ipc/heartbeat');
const workloadRunner = require('./ipc/workload-runner');

let mainWindow;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  registerAllIpc(mainWindow);
  startHeartbeat(mainWindow);
  
  // IPC for showing file open dialog
  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../public/favicon.ico')); // Assuming you have an icon
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => mainWindow.show() },
    { label: 'Quit', click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  tray.setToolTip('PeerCloud');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  // Try to create tray icon. Might fail if icon doesn't exist, ignore for now
  try { createTray(); } catch(e) { console.warn("Failed to create tray, icon might be missing."); }

  app.setLoginItemSettings({ openAtLogin: false });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  workloadRunner.stopAllWorkloads();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
