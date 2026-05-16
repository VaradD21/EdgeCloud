# PeerCloud Build Progress

## Phase 1: Backend Foundation
- [x] Folder structure created
- [x] All MD files written
- [ ] Database models created
- [ ] Alembic migrations working
- [ ] Auth endpoints working (register, login, refresh)
- [ ] Node registration endpoint working
- [ ] Heartbeat endpoint working
- [ ] Listings CRUD working
- [ ] Deployments CRUD working
- [ ] Credits endpoints working
- [ ] Billing worker running
- [ ] Heartbeat checker running
- [ ] Push logs endpoint working
- [ ] Push stats endpoint working
- [ ] Assigned workloads endpoint working

## Phase 2: Desktop App Foundation
- [ ] Electron window opens
- [ ] Vite React renders inside Electron
- [ ] contextBridge preload working
- [ ] Auth IPC working (login, register)
- [ ] LoginPage renders and submits
- [ ] RegisterPage with role selector works
- [ ] Role-based routing works (host vs buyer)
- [ ] System tray icon works
- [ ] Hide to tray on close works

## Phase 3: Host Features
- [ ] Hardware detection works (systeminformation)
- [ ] SetupPage shows real hardware specs
- [ ] Resource sliders work and save config
- [ ] Node registration IPC works
- [ ] Heartbeat loop runs every 30 seconds
- [ ] DashboardPage shows stats
- [ ] WorkloadsPage shows active workloads
- [ ] EarningsPage shows credit history
- [ ] ResourcePage allows changing allocation
- [ ] SettingsPage works

## Phase 4: PCR Engine
- [ ] sandbox.js loads without crash when ffi unavailable
- [ ] Windows Job Object creation works
- [ ] Process assigned to Job Object successfully
- [ ] CPU and memory limits applied
- [ ] sandbox destroy works cleanly
- [ ] package-loader.js unzips and validates .peerpkg
- [ ] runtime-resolver.js finds python and node on PATH
- [ ] process-monitor.js tracks CPU and RAM per PID
- [ ] workload-runner.js starts a workload end to end
- [ ] Log ring buffer captures stdout and stderr
- [ ] Stats pushed to backend every 10 seconds
- [ ] Logs pushed to backend every 5 seconds

## Phase 5: Buyer Features
- [ ] MarketplacePage fetches and displays listings
- [ ] Filters work (CPU, RAM, price)
- [ ] Sort works (price, rating)
- [ ] NodeCard shows all specs correctly
- [ ] DeployPage GitHub URL input works
- [ ] DeployPage env vars dynamic rows work
- [ ] Deploy button triggers deployment creation
- [ ] Deployment status polling works
- [ ] DeploymentDetailPage shows live logs
- [ ] Terminal component streams output
- [ ] ResourceGraph shows CPU and RAM over time
- [ ] Stop deployment works
- [ ] CreditsPage shows balance and history
- [ ] Credits topup (mock) works

## Phase 6: Integration Testing
- [ ] Full flow: host registers node, buyer deploys GitHub repo, sees logs
- [ ] Billing deducts correctly every minute
- [ ] Deployment stops when credits run out
- [ ] Node going offline updates status correctly
- [ ] Uptime score calculates correctly

## Phase 7: Windows Build
- [ ] npm run build produces PeerCloud-Setup.exe
- [ ] Installer runs on clean Windows machine
- [ ] App starts from system tray on Windows boot (optional setting)
- [ ] All features work in production build
