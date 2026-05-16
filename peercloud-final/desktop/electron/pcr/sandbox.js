// sandbox.js - PCR Engine
// Placeholder for Windows Job Object isolation using ffi-napi
const { spawn } = require('child_process');
const processMonitor = require('./process-monitor');

const activeWorkloads = new Map();

async function startWorkload(payload) {
  const { id, runtime, startCmd, envVars, installCmd } = payload;
  
  // TODO: Use ffi-napi to create a Windows Job Object here and apply CPU/RAM limits
  console.log(`Starting workload ${id} with runtime ${runtime}`);
  
  // Basic fallback without strict OS isolation
  const child = spawn(startCmd, { shell: true, env: { ...process.env, ...envVars } });
  
  activeWorkloads.set(id, child);
  processMonitor.monitor(child.pid, id);
  
  child.stdout.on('data', (data) => {
    // In production, emit via IPC to renderer
    console.log(`[${id}] stdout: ${data}`);
  });
  
  child.stderr.on('data', (data) => {
    console.log(`[${id}] stderr: ${data}`);
  });
  
  child.on('close', (code) => {
    console.log(`[${id}] child process exited with code ${code}`);
    processMonitor.stop(id);
    activeWorkloads.delete(id);
  });
  
  return { status: 'running', pid: child.pid };
}

async function stopWorkload(id) {
  const child = activeWorkloads.get(id);
  if (child) {
    child.kill(); // TODO: Kill Job Object for true isolation
    activeWorkloads.delete(id);
    return { status: 'stopped' };
  }
  return { status: 'not_found' };
}

module.exports = {
  startWorkload,
  stopWorkload
};
