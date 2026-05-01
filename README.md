# Edgecloud: Decentralized Compute Marketplace

Edgecloud is a decentralized platform that allows users to rent out their spare computing power (Hosts) or rent high-performance nodes from others (Buyers) to deploy containerized applications.

## 🚀 Key Features

- **Decentralized Marketplace**: Browse, filter, and rent compute nodes based on CPU, RAM, and price.
- **Automated Monitoring**: Integrated heartbeat system that tracks node health and uptime.
- **Failover & Reliability**: Automatic deployment migration when a node goes offline.
- **Host Reputation**: Rating system based on historical uptime and performance.
- **Container Deployments**: Simulated Docker container deployments with custom subdomains.
- **Secure Auth**: Role-based JWT authentication for Buyers and Hosts.

## 🛠 Tech Stack

- **Backend**: FastAPI (Python 3.10+), SQLAlchemy, PostgreSQL.
- **Frontend**: React, Vite, Tailwind CSS, Zustand.
- **Infrastructure**: Docker, Docker Compose, Redis.
- **Simulation Agent**: Lightweight Python script for heartbeat and resource reporting.

## 📁 Project Structure

```text
/backend    - FastAPI server, SQL database, and billing loops
/frontend   - React dashboard, log streaming, and marketplace UI
/agent      - Real Docker orchestration and telemetry agent
/docker     - Infrastructure configuration for local services
```

For an exhaustive breakdown of every function, file, and logic workflow, see the [**EdgeCloud Blueprint**](./EDGECLOUD_BLUEPRINT.md).

## 🏁 Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/edgecloud.git
   cd edgecloud
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and adjust secrets if needed.
   ```bash
   cp .env.example .env
   ```

3. **Launch the Stack**:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build -d
   ```

4. **Access the App**:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8000/docs`

### Running the Node Agent
To simulate a physical node on your local machine:
```bash
cd agent
pip install -r requirements.txt
python agent.py
```

## 📜 Roadmap
- [x] Real Docker Socket integration for physical container spawning.
- [x] Mock Credits & Fractional Billing system.
- [x] Live log streaming & container telemetry.
- [ ] Wallet & Payment gateway integration (Stripe/Crypto).
- [ ] Advanced Node Analytics (Network throughput, Latency).
- [ ] Global load balancing via dynamic reverse proxy.

## 📄 License
Distributed under the MIT License.
