const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn, execSync } = require('child_process');
const sandbox = require('../pcr/sandbox');
const packageLoader = require('../pcr/package-loader');
const runtimeResolver = require('../pcr/runtime-resolver');
const processMonitor = require('../pcr/process-monitor');

const API_URL = 'http://localhost:8000';
const WORKLOADS_DIR = path.join(app.getPath('userData'), 'PeerCloud', 'workloads');
const activeWorkloads = new Map();

// Helper to push logs
async function pushLogs(workloadId, lines, nodeSecret) {
  try {
    await axios.post(`${API_URL}/nodes/push-logs`, {
      deployment_id: workloadId,
      lines: lines
    }, { headers: { 'X-Agent-Key': nodeSecret }});
  } catch (err) {
    console.error("Error pushing logs", err.message);
  }
}

// Helper to push stats
async function pushStats(workloadId, cpu, memoryMb, nodeSecret) {
  try {
    await axios.post(`${API_URL}/nodes/push-stats`, {
      deployment_id: workloadId,
      cpu_percent: cpu,
      ram_mb_used: memoryMb,
      timestamp: new Date().toISOString()
    }, { headers: { 'X-Agent-Key': nodeSecret }});
  } catch (err) {
    console.error("Error pushing stats", err.message);
  }
}

const workloadRunner = {
  async startWorkload(workload, mainWindow, nodeSecret) {
    try {
      if (!fs.existsSync(WORKLOADS_DIR)) fs.mkdirSync(WORKLOADS_DIR, { recursive: true });
      const targetDir = path.join(WORKLOADS_DIR, workload.id);
      
      // 1. Download .peerpkg
      const zipPath = path.join(WORKLOADS_DIR, `${workload.id}.peerpkg`);
      const response = await axios({ method: 'get', url: workload.peerpkgUrl, responseType: 'stream' });
      const writer = fs.createWriteStream(zipPath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // 2. Load Package
      const manifest = packageLoader.loadPackage(zipPath, targetDir);

      // 3. Install CMD
      if (manifest.install_cmd) {
        execSync(manifest.install_cmd, { cwd: targetDir, stdio: 'pipe' });
      }

      // 4. Resolve Runtime
      const runtimeBin = runtimeResolver.resolveRuntime(manifest.runtime);
      
      // 5-6. Build cmd and spawn
      let cmd, args;
      if (runtimeBin) {
        cmd = runtimeBin;
        args = manifest.entrypoint.split(' ');
      } else {
        // Binary
        const parts = manifest.entrypoint.split(' ');
        cmd = path.join(targetDir, parts[0]);
        args = parts.slice(1);
      }

      const mergedEnv = { ...process.env, ...manifest.env, ...workload.envVars };
      const child = spawn(cmd, args, { cwd: targetDir, env: mergedEnv });

      // 7. Create sandbox & assign process
      const sb = sandbox.createSandbox(workload.id, { cpuCores: workload.cpuCores, ramMb: workload.ramMb });
      sandbox.assignProcess(sb, child.pid);

      // 8. Output buffers
      let logBuffer = [];
      const handleLog = (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line) {
            logBuffer.push(line);
            if (logBuffer.length > 500) logBuffer.shift();
            if (mainWindow) {
              mainWindow.webContents.send('workload:log', { id: workload.id, line });
            }
          }
        }
      };

      child.stdout.on('data', handleLog);
      child.stderr.on('data', handleLog);

      const logPusher = setInterval(() => {
        if (logBuffer.length > 0) {
          pushLogs(workload.id, [...logBuffer], nodeSecret);
          logBuffer = []; // reset after push
        }
      }, 5000);

      // 9. Start Process Monitor
      processMonitor.startMonitoring(workload.id, child.pid, (stats) => {
        const w = activeWorkloads.get(workload.id);
        if (w) {
          w.cpu = stats.cpu;
          w.memory = stats.memory;
          if (mainWindow) {
            mainWindow.webContents.send('workload:update', { id: workload.id, cpu: stats.cpu, memory: stats.memory });
          }
          pushStats(workload.id, stats.cpu, stats.memory / (1024 * 1024), nodeSecret);
        }
      });

      // 10. Process exit
      child.on('close', (code) => {
        clearInterval(logPusher);
        if (logBuffer.length > 0) pushLogs(workload.id, [...logBuffer], nodeSecret);
        processMonitor.stopMonitoring(workload.id);
        sandbox.destroySandbox(sb);
        activeWorkloads.delete(workload.id);
        if (mainWindow) {
          mainWindow.webContents.send('workload:update', { id: workload.id, status: 'stopped', exitCode: code });
        }
      });

      activeWorkloads.set(workload.id, {
        id: workload.id,
        child,
        sandbox: sb,
        cpu: 0,
        memory: 0,
        status: 'running',
        logPusher
      });

    } catch (err) {
      console.error(`Failed to start workload ${workload.id}:`, err);
    }
  },

  stopWorkload(id) {
    const w = activeWorkloads.get(id);
    if (w) {
      clearInterval(w.logPusher);
      processMonitor.stopMonitoring(id);
      sandbox.destroySandbox(w.sandbox);
      try { process.kill(w.child.pid); } catch (e) {}
      activeWorkloads.delete(id);
    }
  },

  getAllWorkloads() {
    return Array.from(activeWorkloads.values()).map(w => ({
      id: w.id,
      cpu: w.cpu,
      memory: w.memory,
      status: w.status
    }));
  },

  stopAllWorkloads() {
    for (const id of activeWorkloads.keys()) {
      this.stopWorkload(id);
    }
  }
};

function registerWorkloadIpc(mainWindow) {
  ipcMain.handle('host:getRunningWorkloads', () => {
    return { success: true, data: workloadRunner.getAllWorkloads() };
  });

  ipcMain.handle('host:stopWorkload', (event, id) => {
    workloadRunner.stopWorkload(id);
    return { success: true };
  });
}

module.exports = { ...workloadRunner, registerWorkloadIpc };
