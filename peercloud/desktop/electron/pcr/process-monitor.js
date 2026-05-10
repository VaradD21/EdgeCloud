const pidusage = require('pidusage');

class ProcessMonitor {
  constructor() {
    this.intervals = new Map();
  }

  startMonitoring(workloadId, pid, onStats) {
    if (this.intervals.has(workloadId)) {
      this.stopMonitoring(workloadId);
    }

    const intervalId = setInterval(async () => {
      try {
        const stats = await pidusage(pid);
        onStats({
          workloadId,
          cpu: stats.cpu, // percentage
          memory: stats.memory, // bytes
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        // Process might have exited or is not accessible
        console.error(`Process monitor error for workload ${workloadId} (PID: ${pid}): ${err.message}`);
        this.stopMonitoring(workloadId);
      }
    }, 5000);

    this.intervals.set(workloadId, intervalId);
  }

  stopMonitoring(workloadId) {
    if (this.intervals.has(workloadId)) {
      clearInterval(this.intervals.get(workloadId));
      this.intervals.delete(workloadId);
    }
  }
}

module.exports = new ProcessMonitor();
