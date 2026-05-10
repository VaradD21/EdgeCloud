import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import agentEngine from './agent-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        titleBarStyle: 'hidden',
        backgroundColor: '#0a0a0c',
        show: false
    });

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

app.whenReady().then(async () => {
    // Try to start agent if config exists
    try {
        const config = await agentEngine.loadConfig();
        if (config) {
            await agentEngine.start();
            console.log('Agent started automatically');
        }
    } catch (e) {
        console.log('Agent not started: Needs registration');
    }

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('agent:getStatus', async () => {
    return await agentEngine.getStatus();
});

ipcMain.handle('agent:register', async (event, { email, password, name }) => {
    const config = await agentEngine.registerNode(email, password, name);
    await agentEngine.start();
    return config;
});

ipcMain.handle('agent:start', async () => {
    await agentEngine.start();
    return true;
});

ipcMain.handle('agent:stop', async () => {
    agentEngine.stop();
    return true;
});
