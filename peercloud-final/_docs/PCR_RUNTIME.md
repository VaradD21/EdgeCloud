# PCR Runtime Engine

The PeerCloud Runtime (PCR) Engine handles execution of workloads directly on the host machine without requiring Docker.

## Why PCR Exists
Docker requires significant OS integration (WSL2 on Windows, virtualization on macOS) and administrator privileges. This creates a high barrier to entry for hosts. PCR is entirely user-space (using OS native process controls) allowing any user to run the PeerCloud agent seamlessly just by launching an `.exe`.

## The `.peerpkg` Format
When not using GitHub, buyers upload a standard ZIP file with a `peercloud.yaml` manifest.

**Example `peercloud.yaml`**:
```yaml
version: 1
runtime: node
install_cmd: npm install
start_cmd: node index.js
port: 3000
env:
  NODE_ENV: production
```

## GitHub Deployment Flow
1. Backend receives a `github_url`.
2. Backend assigns the deployment to a node.
3. Node's heartbeat loop fetches the assigned workload.
4. Node executes `git clone <url> workloads/<deployment_id>/`.
5. Node reads `peercloud.yaml` or uses provided API overrides.
6. Node updates status to `installing` and runs `install_cmd`.
7. Node updates status to `running` and runs `start_cmd`.
8. The process `stdout` and `stderr` are piped into the PCR ring buffer.

## Windows Job Object Implementation
The engine relies on `node-ffi-napi` to call Win32 APIs for Windows Job Objects.
- **CreateJobObject**: Creates a sandbox environment.
- **SetInformationJobObject**: Sets hard limits:
  - `JOBOBJECT_CPU_RATE_CONTROL_INFORMATION`: Limits CPU usage percentage.
  - `JOBOBJECT_EXTENDED_LIMIT_INFORMATION`: Limits peak memory usage and active process count.
- **AssignProcessToJobObject**: Binds the spawned child process to the job. If the process spawns children, they are automatically part of the Job Object.

**Graceful Fallback**: If `node-ffi-napi` fails to compile or load (common on some Windows setups without build tools), PCR catches the error and executes standard Node.js `child_process.spawn()` without OS-level limits, relying instead on process monitoring to manually kill processes that over-consume resources.

## Runtime Resolver Logic
The Engine checks the system `PATH` to resolve interpreters:
- `python`: Checks for `python` or `python3`.
- `node`: Checks for `node`.
- `binary`: Runs the file directly.
- `static`: Uses a lightweight `serve` equivalent bundled in PCR.

## Process Monitoring
Uses the `pidusage` package to track metrics:
- Fetches CPU % and RAM usage per PID every 10 seconds.
- Pushes these metrics to the backend `/nodes/push-stats`.

## Log Ring Buffer
- Captures `stdout` and `stderr` for every running workload.
- Keeps a maximum of 500 lines in memory.
- Pushes accumulated lines to the backend `/nodes/push-logs` every 5 seconds.
