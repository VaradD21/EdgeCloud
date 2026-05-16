const pidusage = require('pidusage');

const intervals = new Map();

function monitor(pid, jobId) {
  const intervalId = setInterval(async () => {
    try {
      const stats = await pidusage(pid);
      // In production, emit via IPC to renderer to display to user and push to backend
      // console.log(`[${jobId}] CPU: ${Math.round(stats.cpu)}% RAM: ${Math.round(stats.memory / 1024 / 1024)}MB`);
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
