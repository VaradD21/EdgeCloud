const ffi = require('ffi-napi');
const path = require('path');

class Sandbox {
  constructor() {
    this.ffiAvailable = false;
    this.kernel32 = null;
    
    try {
      this.kernel32 = ffi.Library('kernel32', {
        'CreateJobObjectA': ['pointer', ['pointer', 'string']],
        'SetInformationJobObject': ['bool', ['pointer', 'int', 'pointer', 'int']],
        'AssignProcessToJobObject': ['bool', ['pointer', 'pointer']],
        'OpenProcess': ['pointer', ['uint32', 'bool', 'uint32']],
        'TerminateJobObject': ['bool', ['pointer', 'uint']],
        'CloseHandle': ['bool', ['pointer']],
        'SetPriorityClass': ['bool', ['pointer', 'uint32']]
      });
      this.ffiAvailable = true;
      console.log("ffi-napi loaded successfully, Windows Job Objects are available.");
    } catch (err) {
      console.warn("WARNING: ffi-napi failed to load. Running in degraded mode without hard resource limits.", err.message);
      this.ffiAvailable = false;
    }
  }

  createSandbox(workloadId, options) {
    const { cpuCores, ramMb } = options;
    
    if (!this.ffiAvailable) {
      return { id: workloadId, degraded: true };
    }

    // Windows API constants
    const JOBOBJECT_EXTENDED_LIMIT_INFORMATION = 9;
    const JOBOBJECT_CPU_RATE_CONTROL_INFORMATION = 15;
    
    const jobHandle = this.kernel32.CreateJobObjectA(null, "PeerCloud_" + workloadId);
    
    // In a real implementation we would allocate a Buffer and fill it with the appropriate struct data
    // for JOBOBJECT_EXTENDED_LIMIT_INFORMATION and JOBOBJECT_CPU_RATE_CONTROL_INFORMATION.
    // For this prototype, we mock the buffer setup since defining the full structs in ffi is complex.
    
    // Mock memory limits buffer (simplified)
    const extLimitBuf = Buffer.alloc(112); // sizeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION) varies, approx 112 bytes
    // Set BasicLimitInformation.LimitFlags (0x00000200 for JOB_OBJECT_LIMIT_JOB_MEMORY + 0x00000100 for JOB_OBJECT_LIMIT_PROCESS_MEMORY)
    extLimitBuf.writeUInt32LE(0x00000300, 16); 
    const memoryLimit = ramMb * 1024 * 1024;
    // ProcessMemoryLimit
    extLimitBuf.writeBigUInt64LE(BigInt(memoryLimit), 64);
    // JobMemoryLimit
    extLimitBuf.writeBigUInt64LE(BigInt(memoryLimit), 72);
    
    this.kernel32.SetInformationJobObject(jobHandle, JOBOBJECT_EXTENDED_LIMIT_INFORMATION, extLimitBuf, extLimitBuf.length);
    
    // Mock CPU limits buffer
    const cpuLimitBuf = Buffer.alloc(8);
    // ControlFlags = 0x1 (JOB_OBJECT_CPU_RATE_CONTROL_ENABLE) + 0x2 (JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP)
    cpuLimitBuf.writeUInt32LE(0x3, 0);
    // CpuRate (10000 = 100%)
    const cpuRate = Math.min(10000, Math.round(cpuCores * 100 * 100));
    cpuLimitBuf.writeUInt32LE(cpuRate, 4);
    
    this.kernel32.SetInformationJobObject(jobHandle, JOBOBJECT_CPU_RATE_CONTROL_INFORMATION, cpuLimitBuf, cpuLimitBuf.length);

    return { id: workloadId, jobHandle, degraded: false };
  }

  assignProcess(sandboxObj, pid) {
    const PROCESS_ALL_ACCESS = 0x1FFFFF;
    const BELOW_NORMAL_PRIORITY_CLASS = 0x00004000;
    
    if (this.ffiAvailable && this.kernel32) {
      const processHandle = this.kernel32.OpenProcess(PROCESS_ALL_ACCESS, false, pid);
      if (sandboxObj.degraded) {
        this.kernel32.SetPriorityClass(processHandle, BELOW_NORMAL_PRIORITY_CLASS);
      } else {
        this.kernel32.AssignProcessToJobObject(sandboxObj.jobHandle, processHandle);
      }
      this.kernel32.CloseHandle(processHandle);
    } else {
      console.log(`Fallback: Cannot set process priority for PID ${pid} natively.`);
      // Could use `wmic process where processid=${pid} CALL setpriority 16384` via child_process here
    }
  }

  destroySandbox(sandboxObj) {
    if (this.ffiAvailable && this.kernel32 && !sandboxObj.degraded && sandboxObj.jobHandle) {
      this.kernel32.TerminateJobObject(sandboxObj.jobHandle, 0);
      this.kernel32.CloseHandle(sandboxObj.jobHandle);
    }
  }
}

module.exports = new Sandbox();
