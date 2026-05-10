const axios = require('axios');
const fs = require('fs');
const { app, Notification } = require('electron');
const { CONFIG_PATH } = require('./node-registration');
const workloadRunner = require('./workload-runner');
const pidusage = require('pidusage');

const API_URL = 'http://localhost:8000';
let heartbeatInterval = null;
let failures = 0;

function startHeartbeat(mainWindow) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  heartbeatInterval = setInterval(async () => {
    try {
      if (!fs.existsSync(CONFIG_PATH)) return;
      
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (!config.node_secret) return;

      // GET assigned workloads
      const workloadsResp = await axios.get(`${API_URL}/nodes/assigned-workloads`, {
        headers: { 'X-Agent-Key': config.node_secret }
      });
      
      const assigned = workloadsResp.data || [];
      const runningIds = workloadRunner.getAllWorkloads().map(w => w.id);
      
      // Start assigned but not running
      for (const w of assigned) {
        if (!runningIds.includes(w.id)) {
          await workloadRunner.startWorkload({
            id: w.id,
            peerpkgUrl: w.package_url,
            cpuCores: w.cpu_cores,
            ramMb: w.ram_mb,
            diskMb: w.disk_mb,
            envVars: w.env_vars
          }, mainWindow, config.node_secret);
        }
      }

      // Stop running but not assigned
      const assignedIds = assigned.map(w => w.id);
      for (const id of runningIds) {
        if (!assignedIds.includes(id)) {
          workloadRunner.stopWorkload(id);
        }
      }

      // Collect node total stats (approximate from workloads)
      const workloads = workloadRunner.getAllWorkloads();
      let cpuPercent = workloads.reduce((sum, w) => sum + (w.cpu || 0), 0);
      let ramUsedGb = workloads.reduce((sum, w) => sum + (w.memory || 0), 0) / (1024 ** 3);
      
      // Send heartbeat
      await axios.post(`${API_URL}/nodes/heartbeat`, {
        node_id: config.node_id,
        cpu_usage_percent: cpuPercent,
        ram_usage_percent: Math.min(100, Math.round(ramUsedGb * 100)), // Approximate percent if we don't calculate strictly against total
        storage_usage_percent: 0, // Ignored for now
        running_deployment_ids: workloads.map(w => w.id)
      }, {
        headers: { 'X-Agent-Key': config.node_secret }
      });
      
      failures = 0; // Reset failures

    } catch (err) {
      console.error("Heartbeat error:", err.message);
      failures++;
      if (failures === 3) {
        new Notification({
          title: "PeerCloud Disconnected",
          body: "Failed to reach the EdgeCloud backend 3 times."
        }).show();
      }
    }
  }, 30000); // Every 30 seconds
}

module.exports = { startHeartbeat };
