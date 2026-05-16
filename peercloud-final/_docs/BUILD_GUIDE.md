# Build Guide

This guide explains how to set up the PeerCloud development environment and build the application.

## 1. Backend Setup
**Requirements:**
- Python 3.11+
- PostgreSQL 15
- Redis 7
- Docker (for infra)

**Steps:**
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy environment template:
   ```bash
   cp .env.example .env
   ```
5. Apply database migrations:
   ```bash
   alembic upgrade head
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## 2. Infrastructure Setup (Docker Compose)
Only external services (DB, Cache, Storage, Celery) run in Docker. The FastAPI backend runs locally.

**Services included:**
- `postgres:15-alpine`
- `redis:7-alpine`
- `minio`
- `celery_worker`
- `celery_beat`

**Steps:**
1. Navigate to `infra/`:
   ```bash
   cd infra
   ```
2. Start the services:
   ```bash
   docker compose up -d
   ```

## 3. Desktop App Setup
**Requirements:**
- Node.js 20
- npm

**Steps:**
1. Navigate to the `desktop/` directory:
   ```bash
   cd desktop
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React dev server + Electron:
   ```bash
   npm run dev
   ```

## 4. Building the Windows Installer
To produce the standalone `.exe` that hosts and buyers will install:

1. Inside `desktop/`:
   ```bash
   npm run build
   ```
2. The output installer will be located at:
   `desktop/dist/PeerCloud-Setup.exe`
