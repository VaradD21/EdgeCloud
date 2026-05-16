# Architecture

PeerCloud is a decentralized compute marketplace desktop application where people with idle PCs earn money by sharing resources, and developers deploy real projects without paying expensive cloud provider prices. Everything runs through one single Electron desktop application; there is no separate website or browser experience.

## System Layers
1. **Backend (FastAPI)**: The central brain of the platform. It handles authentication, node registry, marketplace listings, credit balances, deployment metadata, and orchestration logic.
2. **Desktop App (Electron + React)**: The unified application for both Host and Buyer roles. It provides the UI, communicates with the Backend via REST APIs, and uses local hardware capabilities via IPC.
3. **PCR Engine (PeerCloud Runtime)**: The execution environment bundled within the Desktop App. It handles the secure isolation, monitoring, and lifecycle of workloads directly on the host machine using native OS primitives (Windows Job Objects).

## Host App End-to-End Workflow
1. The app detects the hardware configuration automatically on its first launch.
2. The host user uses resource sliders to determine how much CPU, RAM, and disk they want to sell and sets a price per hour in credits. This registers the node with the Backend.
3. A heartbeat loop runs in the background, pinging the Backend every 30 seconds to maintain an "online" status.
4. When a buyer selects the node, the Backend assigns a workload. The node picks this up on its next heartbeat.
5. The PCR engine executes the workload using Windows Job Objects for isolation and resource capping.
6. CPU, RAM stats, and stdout/stderr logs are pushed back to the Backend iteratively (stats every 10 seconds, logs every 5 seconds).
7. Credits continuously accumulate in the host's account as workloads run.

## Buyer App End-to-End Workflow
1. The buyer opens the Marketplace page, browsing available nodes filtered by price, hardware specs, and uptime score.
2. The buyer selects a node and sets up their project.
3. They can either:
   - **Option A**: Paste a GitHub repository URL. The platform clones it directly onto the host node.
   - **Option B**: Upload a `.peerpkg` file.
4. The buyer configures the runtime (Python, Node.js, static, or binary), an install command, a start command, and environment variables.
5. The deployment configuration goes to the Backend, which assigns it to the target node via the heartbeat mechanism.
6. The buyer's dashboard shows a live terminal with stdout/stderr and live resource usage graphs (CPU and RAM).
7. Credits are deducted per minute of actual usage until stopped or the balance runs out.

## Credit System
- Buyers top up credits inside the app. 
- Credits are deducted per minute of usage based on the host's set hourly price. 
- When credits run out, the deployment stops automatically. 
- Hosts accumulate credits from running workloads, which can later be requested as payouts.

## Uptime Score Formula
`score = (online_seconds / total_seconds_in_last_30_days) * 100`

The score is rounded to one decimal place. It acts as an automatic reputation system, directly affecting a node's marketplace ranking and filtering out unreliable hosts.

## The `.peerpkg` Format
This is a standard ZIP file containing the project source code and a `peercloud.yaml` manifest. The manifest specifies the runtime, entry points, and required commands.

## PCR Runtime Types
- **python**: Requires a Python environment on the path.
- **node**: Requires Node.js.
- **binary**: Executes a standalone compiled executable.
- **static**: Serves static files directly via a lightweight built-in HTTP server.

## Windows Job Object Isolation
Instead of relying on Docker, the PCR Engine utilizes Windows Job Objects via `node-ffi-napi`.
- **Limits**: Configures CPU rate control, memory limits, and process count constraints.
- **Graceful Fallback**: If the `ffi` native module is unavailable (e.g., failed to compile), the runtime gracefully falls back to standard Node `child_process` execution without hard OS constraints, but will still stop workloads if they severely overconsume monitored resources.

## Tech Stack
| Component | Technology |
| :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.11) |
| **Database** | PostgreSQL 15 |
| **Migrations** | Alembic |
| **Caching / PubSub / Logs** | Redis 7 |
| **Object Storage** | MinIO |
| **Background Workers** | Celery |
| **Desktop Framework** | Electron + React (Vite) |
| **Desktop Styling** | Tailwind CSS |
| **Desktop API Client** | Axios |
| **Native Process Control** | Windows Job Objects (ffi-napi) |
| **Process Monitoring** | pidusage |
