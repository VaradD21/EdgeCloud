// sandbox.js - PCR Engine
// Placeholder for Windows Job Object isolation using ffi-napi
const { spawn } = require('child_process');
const processMonitor = require('./process-monitor');

const activeWorkloads = new Map();

async function startWorkload(payload, webContents) {
  const { id, runtime, startCmd, envVars, installCmd, cpu_cores, ram_mb } = payload;
  
  // Implementation Note: A full Windows Job Object via ffi-napi is complex and prone to crashes.
  // Using a stable fallback for this iteration that actively tracks resource limits via pidusage
  // instead of hard OS constraints to guarantee app stability.
  console.log(`Starting workload ${id} with runtime ${runtime}`);
  if (webContents) {
      webContents.send('workload-log', { id, type: 'system', message: `Starting workload ${id}...` });
  }
  
  const child = spawn(startCmd, { shell: true, env: { ...process.env, ...envVars } });
  
  activeWorkloads.set(id, child);
  processMonitor.monitor(child.pid, id, webContents, { cpu_cores, ram_mb }, child);
  
  child.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`[${id}] stdout: ${text}`);
    if (webContents) webContents.send('workload-log', { id, type: 'stdout', message: text });
  });
  
  child.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`[${id}] stderr: ${text}`);
    if (webContents) webContents.send('workload-log', { id, type: 'stderr', message: text });
  });
  
  child.on('close', (code) => {
    console.log(`[${id}] child process exited with code ${code}`);
    if (webContents) webContents.send('workload-log', { id, type: 'system', message: `Process exited with code ${code}` });
    processMonitor.stop(id);
    activeWorkloads.delete(id);
  });
  
  return { status: 'running', pid: child.pid };
}

async function stopWorkload(id) {
  const child = activeWorkloads.get(id);
  if (child) {
    child.kill(); // Kills process tree fallback
    processMonitor.stop(id);
    activeWorkloads.delete(id);
    return { status: 'stopped' };
  }
  return { status: 'not_found' };
}

module.exports = {
  startWorkload,
  stopWorkload
};
