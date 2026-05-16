# IPC Reference

The Desktop App uses `contextBridge` to expose a safe API (`window.peercloud`) to the React frontend.

## Auth
- **`login(credentials)`**
  - **Does**: Sends login request to backend, stores JWT in secure storage.
  - **Returns**: `{ user, tokens }` or throws error.
- **`register(userData)`**
  - **Does**: Registers user on backend, stores JWT.
  - **Returns**: `{ user, tokens }`
- **`logout()`**
  - **Does**: Clears local secure storage.
  - **Returns**: `true`

## Hardware
- **`getHardwareSpecs()`**
  - **Does**: Uses `systeminformation` to fetch local system specs.
  - **Returns**: `{ cpu_cores, ram_gb_total, disk_gb_total, platform }`

## Host Node
- **`registerNode(config)`**
  - **Does**: Registers node with Backend. Receives and securely stores `node_secret`.
  - **Returns**: `{ node_id }`
- **`saveResourceConfig(config)`**
  - **Does**: Saves the host's preferred CPU/RAM/Disk limits and pricing.
  - **Returns**: `true`
- **`startHeartbeat()`**
  - **Does**: Initiates the 30-second interval heartbeat loop.
  - **Returns**: `true`
- **`stopHeartbeat()`**
  - **Does**: Stops the interval loop.
  - **Returns**: `true`

## Workloads (PCR)
- **`getActiveWorkloads()`**
  - **Does**: Returns local state of workloads currently running via PCR.
  - **Returns**: `[{ deployment_id, pid, cpu_usage, ram_usage }]`

## Marketplace & Buyer Actions
- **`fetchListings(filters)`**
  - **Does**: Wraps the backend API call to fetch available nodes.
  - **Returns**: `[ ...listings ]`
- **`deploy(payload)`**
  - **Does**: Wraps backend POST `/deployments`.
  - **Returns**: `{ deployment_id, subdomain }`
- **`stopDeployment(id)`**
  - **Does**: Wraps backend DELETE `/deployments/{id}`.
  - **Returns**: `true`

## Terminal
- **`subscribeLogs(deploymentId, callback)`**
  - **Does**: Sets up a long-poll or WebSocket stream to receive new logs from backend.
  - **Returns**: `unsubscribeFunction`
- **`subscribeStats(deploymentId, callback)`**
  - **Does**: Sets up a stream for live CPU/RAM stats.
  - **Returns**: `unsubscribeFunction`

## Credits
- **`fetchBalance()`**
  - **Does**: Wraps backend GET `/credits/balance`.
  - **Returns**: `{ balance_cents }`
- **`topUpCredits(amount)`**
  - **Does**: Wraps backend POST `/credits/topup`.
  - **Returns**: `new_balance`
