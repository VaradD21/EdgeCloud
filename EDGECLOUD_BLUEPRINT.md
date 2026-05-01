# EdgeCloud: Decentralized Bare-Metal Orchestration Blueprint

EdgeCloud is a high-performance, decentralized compute marketplace that allows users (**Hosts**) to rent out their idle bare-metal hardware and users (**Buyers**) to deploy containerized workloads (Docker) onto those nodes. It features a real-time telemetry system, automated fractional billing, and a sleek, glassmorphic dashboard.

---

## 1. Technology Stack

### Backend (The Core)
- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite (Development) / PostgreSQL (Production ready)
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT (JSON Web Tokens) with Bcrypt hashing
- **Task Orchestration**: Custom asynchronous background loops
- **Communication**: REST API + WebSockets (for live telemetry/logs)

### Frontend (The Dashboard)
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand (Atomic & Persistent)
- **Animations**: Framer Motion (Smooth glassmorphism transitions)
- **Icons**: Lucide React
- **API Client**: Axios (with centralized interceptors)

### Agent (The Orchestrator)
- **Language**: Python 3.10+
- **Containerization**: Docker SDK for Python
- **Metrics**: `psutil` (Non-blocking system telemetry)
- **Security**: Node-specific JWT secrets for heartbeat validation

---

## 2. System Architecture

EdgeCloud operates on a **Triadic Architecture**:

1.  **The Central API (Brain)**: Manages users, listings, deployments, and billing. It acts as the source of truth.
2.  **The Node Agent (Heart)**: Runs on the Host's physical machine. It polls the Brain for desired state, manages Docker containers, and pushes telemetry.
3.  **The User Dashboard (Eyes)**: Provides a visual interface for Buyers to rent nodes and Hosts to manage their hardware.

---

## 3. Project Directory Structure

```text
e:/EdgeCloud/
├── agent/                  # Node-side orchestration logic
│   ├── agent.py            # Main polling loop & telemetry reporting
│   ├── docker_runner.py    # Container lifecycle management (Start/Stop/Sync)
│   └── requirements.txt    # Agent dependencies (docker, psutil, requests)
├── backend/                # Central API & Database
│   ├── alembic/            # Database migration history
│   ├── routers/            # API Route modules (Modularized)
│   │   ├── admin.py        # System administration (unused in MVP)
│   │   ├── agent.py        # Endpoints specifically for Node Agents
│   │   ├── credits.py      # Billing, balance, and transaction history
│   │   ├── user.py         # User profile & settings management
│   │   └── ws.py           # WebSocket handlers for live dashboards
│   ├── utils/              # Helper utilities
│   │   └── resources.py    # Atomic resource reservation/release logic
│   ├── main.py             # FastAPI Entry point & Auth routes
│   ├── models.py           # SQLAlchemy Database Models
│   ├── schemas.py          # Pydantic Data Validation (Frontend/Internal)
│   ├── schemas_agent.py    # Pydantic schemas specific to Agent communication
│   ├── tasks.py            # Background loops (Billing, Failure detection)
│   ├── log_store.py        # In-memory ring buffer for container logs
│   └── container_metrics.py# Logic for processing agent telemetry
├── frontend/               # React Dashboard
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── Layout.jsx  # Main App Shell (Role-based Sidebar)
│   │   │   ├── ui.jsx      # Atomic UI (Badge, Alert, Modal, Skeleton)
│   │   │   └── ProtectedRoute.jsx # Auth Guard
│   │   ├── pages/          # Full-page views
│   │   │   ├── Dashboard.jsx   # Stats overview & live usage
│   │   │   ├── Marketplace.jsx # Node browsing & filtering
│   │   │   ├── Deploy.jsx      # Configuration for new workloads
│   │   │   ├── Deployments.jsx # List of active workloads
│   │   │   ├── DeploymentDetails.jsx # Control center & Log viewer
│   │   │   ├── Credits.jsx     # Billing & Transaction history
│   │   │   ├── Nodes.jsx       # Host-only node management
│   │   │   └── Settings.jsx    # User account management
│   │   ├── store/          # Zustand state (Auth, User)
│   │   └── lib/            # Axios instance & API config
└── docker/                 # Infrastructure configuration (Postgres/Redis)
```

---

## 4. Feature Deep-Dive

### A. Authentication & RBAC (Role-Based Access Control)
- **Roles**: `buyer` (rents compute) and `host` (provides compute).
- **Security**: JWT-based session management. Access tokens contain `role` claims to restrict UI elements and API endpoints.
- **Node Secrets**: Every physical node is assigned a unique JWT secret to prevent unauthorized telemetry injection.

### B. Deployment Lifecycle
1.  **Selection**: Buyer picks a node from the Marketplace.
2.  **Configuration**: Buyer specifies Docker Image (e.g., `nginx:latest`), Name, and Ports.
3.  **Reservation**: API atomically reserves CPU/RAM on the target node.
4.  **Orchestration**:
    *   The Agent (polling every 10s) sees a new `desired_state: running`.
    *   Agent pulls the image, creates the container with labels, and starts it.
    *   Agent reports back `actual_state: running`.
5.  **Control**: Buyer can Start/Stop/Restart/Delete via the Dashboard.

### C. Fractional Billing System
- **Precision**: Billing is calculated per-minute using a background loop in `tasks.py`.
- **Formula**: `(PricePerHour / 3600) * SecondsPassed`.
- **Integrity**: 
    *   `run_billing_cycle`: Charges active workloads every minute.
    *   `delete_deployment`: Calculates a final fractional charge for the time since the last billing cycle.
- **Ledger**: Every charge creates a `CreditTransaction` entry for transparency.

### D. Live Telemetry & Log Streaming
- **Telemetry**: The Agent uses `psutil` to capture Node and Container utilization. This flows through WebSockets to the Dashboard.
- **Log Streaming**: Agent captures the last 100 lines of `stdout/stderr` from containers and pushes them to the Brain. The Brain stores these in a per-deployment ring buffer (`log_store.py`).

### E. Host Node Management
- **Resource Limits**: Hosts can set `max_cpu_percent` and `max_ram_percent` to prevent EdgeCloud from consuming 100% of the host machine.
- **Soft Kill**: Hosts can toggle `enabled: false` to stop their node from accepting new deployments while keeping existing ones running.

---

## 5. File & Functionality Breakdown

### 5. Detailed Component & Functionality Breakdown

#### A. Backend Components (`/backend`)
- `main.py`:
  - `register_user()`: Validates roles and hashes passwords using Bcrypt.
  - `create_deployment()`: The entry point for buyers. It checks for sufficient user credits before allowing a reservation.
  - `start_deployment()` / `stop_deployment()`: Updates the `desired_status` in the DB. The Agent will eventually see this and act.
- `routers/agent.py`:
  - `get_deployment_tasks()`: Used by nodes to fetch what they *should* be running.
  - `report_usage()`: Receives telemetry JSON from the agent and updates the `Node` and `Deployment` tables.
- `routers/ws.py`:
  - `buyer_dashboard_ws()`: Streams live container metrics (CPU/RAM) and deployment status changes to the frontend.
- `tasks.py`:
  - `run_billing_cycle()`: Prevents "Double Charging" by checking the `last_billed_at` timestamp before applying charges.
  - `failover_task()`: Automatically marks nodes as `offline` if heartbeats are missed for >30 seconds.
- `utils/resources.py`:
  - `reserve_resources()`: Uses a SQL `UPDATE ... WHERE cpu_total - cpu_reserved >= requested` to prevent race conditions during high-concurrency deployments.

#### B. Frontend Components (`/frontend/src`)
- `components/Layout.jsx`:
  - Implements the **Sidebar Navigation**. It uses `framer-motion` for the active indicator and checks `user.role` to hide "Nodes" from Buyers and "Marketplace" from Hosts.
- `pages/DeploymentDetails.jsx`:
  - **`action(verb)`**: A generic function that triggers `start`, `stop`, or `restart` via the API.
  - **`fetchLogs()`**: Polls the `/logs` endpoint every 5s to update the terminal view.
- `pages/Marketplace.jsx`:
  - **`getBadges()`**: Logic that assigns "Top Rated" or "Best Value" based on the current list's statistical outliers.
- `pages/Nodes.jsx`:
  - **`toggleNode()`**: Sends a PATCH request to the backend to enable/disable a node's availability.
  - **`saveLimits()`**: Submits the resource constraint sliders (CPU/RAM percentages).
- `store/authStore.js`:
  - A Zustand store that persists the JWT in `localStorage`, ensuring users stay logged in across refreshes.

#### C. Agent Components (`/agent`)
- `agent.py`:
  - `run_agent()`: The main loop. It captures global system metrics (via `psutil.cpu_percent`) and sends heartbeats.
  - `push_logs()`: Reads the last few lines of container logs and sends them to the Brain.
- `docker_runner.py`:
  - `DockerManager.reconcile()`: The "Source of Truth" resolver. It iterates through the list of containers. If it finds one that shouldn't be there, it kills it. If it's missing one that should be there, it spawns it.
  - `DockerManager.get_container_stats()`: Maps Docker's raw byte metrics into human-readable percentages.

---

### 6. Core Workflows (The "How & Why")

#### How Billing Works (The "Fractional" Logic)
We use a **Post-Paid Fractional Billing** model. 
1. The user must have a minimum of 1 Credit to start.
2. Every minute, the backend loops through all `status: running` deployments.
3. It calculates `cost = hourly_rate / 60`. 
4. If the user runs out of credits, the `billing_cycle` automatically marks the deployment as `stopped` and notifies the agent to kill the container.

#### Why we use Docker Labels?
In `agent/docker_runner.py`, we attach a label `edgecloud.deployment_id` to every container.
*   **Why?**: If the Agent crashes and restarts, it has no memory of what it was doing. By scanning Docker labels, it can "re-adopt" its containers and sync their state back to the Brain without accidentally killing them or spawning duplicates.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Create a new Buyer or Host account |
| `GET` | `/listings` | List all available compute nodes |
| `POST` | `/deployments` | Create and reserve a new workload |
| `POST` | `/deployments/{id}/stop` | Command the agent to stop a container |
| `GET` | `/deployments/{id}/logs` | Fetch current log buffer |
| `GET` | `/credits/balance` | Get current user credit balance |
| `PATCH` | `/nodes/{id}/limits` | Host updates node resource constraints |

---

## 7. How to Run

### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. `uvicorn main:app --reload`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Agent
1. `cd agent`
2. `pip install -r requirements.txt`
3. `python agent.py` (Ensure `NODE_ID` and `NODE_SECRET` are set in `.env`)

---

*This document serves as the master blueprint for the EdgeCloud ecosystem. Version 1.0.0*
