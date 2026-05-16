const pidusage = require('pidusage');

const intervals = new Map();

function monitor(pid, jobId, webContents, limits, childProcess) {
  const intervalId = setInterval(async () => {
    try {
      const stats = await pidusage(pid);
      const cpuPercent = Math.round(stats.cpu);
      const ramMB = Math.round(stats.memory / 1024 / 1024);
      
      if (webContents) {
        webContents.send('workload-stats', { id: jobId, cpu: cpuPercent, ram: ramMB });
      }
      
      // Soft-enforcement of memory limits
      if (limits && limits.ram_mb && ramMB > limits.ram_mb) {
        if (webContents) {
          webContents.send('workload-log', { 
            id: jobId, 
            type: 'system', 
            message: `FATAL: Process exceeded RAM limit (${ramMB}MB > ${limits.ram_mb}MB). Terminating...` 
          });
        }
        if (childProcess) childProcess.kill();
      }
    } catch (err) {
      console.error(`Failed to monitor ${pid}:`, err.message);
      stop(jobId);
    }
  }, 10000); // every 10 seconds
  
  intervals.set(jobId, intervalId);
}

function stop(jobId) {
  const intervalId = intervals.get(jobId);
  if (intervalId) {
    clearInterval(intervalId);
    intervals.delete(jobId);
  }
}

module.exports = {
  monitor,
  stop
};
