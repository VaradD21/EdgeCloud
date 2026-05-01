#!/usr/bin/env python3
"""
EdgeCloud Node Agent.

Responsibilities:
1. Register this machine as a compute node (--register)
2. Send periodic heartbeats with CPU/RAM/Disk metrics
3. Poll /agent/deployments and reconcile Docker state via docker_runner
"""
import logging
import requests
import time
import json
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("edgecloud")

try:
    import psutil
    psutil.cpu_percent(interval=None) # Initialize baseline
except ImportError:
    print("ERROR: Run 'pip install psutil' first.")
    sys.exit(1)

import docker_runner  # local module

CONFIG_FILE = Path(".edgecloud_node")
BACKEND_URL = os.getenv("EDGECLOUD_URL", "http://localhost:8000")
HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", "30"))   # seconds
POLL_INTERVAL      = int(os.getenv("POLL_INTERVAL",      "30"))   # seconds
LOG_INTERVAL       = int(os.getenv("LOG_INTERVAL",       "60"))   # seconds
METRICS_INTERVAL   = int(os.getenv("METRICS_INTERVAL",   "15"))   # seconds


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def load_config() -> dict | None:
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text())
    return None


def save_config(data: dict) -> None:
    CONFIG_FILE.write_text(json.dumps(data, indent=2))
    log.info(f"Config saved to {CONFIG_FILE}")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register_node(host_token: str, name: str | None = None, skip_confirm: bool = False):
    print("\n--- Node Registration ---")
    if not name:
        name = input("Node name (e.g. gaming-rig-1): ").strip()
    cpu  = psutil.cpu_count(logical=True)
    ram  = round(psutil.virtual_memory().total / (1024 ** 3), 1)
    disk = round(psutil.disk_usage("/").total / (1024 ** 3), 1)
    print(f"Detected: {cpu} CPU cores, {ram}GB RAM, {disk}GB storage")

    if not skip_confirm:
        if input("Register with these specs? (y/n): ").strip().lower() != "y":
            print("Registration cancelled.")
            return

    resp = requests.post(
        f"{BACKEND_URL}/nodes/register",
        json={"name": name, "cpu_total": cpu, "ram_total": ram, "storage_total_gb": disk},
        headers={"Authorization": f"Bearer {host_token}"},
        timeout=10,
    )
    if resp.status_code != 200:
        print(f"Registration failed: {resp.text}")
        return

    data = resp.json()
    save_config({"node_id": data["id"], "node_secret": data["node_secret"], "name": name})
    print(f"\nRegistered! Node ID: {data['id']}")
    return data


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def get_metrics() -> dict:
    cpu  = psutil.cpu_percent(interval=None)
    mem  = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    return {
        "cpu_usage_percent":     round(cpu, 1),
        "ram_used_gb":           round(mem.used  / (1024 ** 3), 2),
        "ram_total_gb":          round(mem.total / (1024 ** 3), 2),
        "ram_usage_percent":     round(mem.percent, 1),
        "storage_used_gb":       round(disk.used  / (1024 ** 3), 2),
        "storage_total_gb":      round(disk.total / (1024 ** 3), 2),
        "storage_usage_percent": round(disk.percent, 1),
    }


# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------

def send_heartbeat(node_id: str, node_secret: str) -> None:
    metrics = get_metrics()
    payload = {**metrics, "node_id": node_id}
    try:
        resp = requests.post(
            f"{BACKEND_URL}/nodes/heartbeat",
            json=payload,
            headers={"Authorization": f"Bearer {node_secret}"},
            timeout=10,
        )
        badge = "OK" if resp.status_code == 200 else f"WARN {resp.status_code}"
        log.info(
            f"Heartbeat {badge} | CPU {metrics['cpu_usage_percent']}% "
            f"| RAM {metrics['ram_usage_percent']}% "
            f"| Disk {metrics['storage_usage_percent']}%"
        )
    except Exception as e:
        log.warning(f"Heartbeat FAILED: {e}")


# ---------------------------------------------------------------------------
# Rejection reporter  (called by docker_runner via callback)
# ---------------------------------------------------------------------------

def make_reject_reporter(node_secret: str):
    """Return a closure that POSTs a resource-rejection report to the backend."""
    def report_rejection(deployment_id: str, reason: str,
                         available_cpu: float, available_ram_gb: float) -> None:
        try:
            resp = requests.post(
                f"{BACKEND_URL}/agent/report-rejection",
                json={
                    "deployment_id":   deployment_id,
                    "reason":          reason,
                    "available_cpu":   available_cpu,
                    "available_ram_gb": available_ram_gb,
                },
                headers={"Authorization": f"Bearer {node_secret}"},
                timeout=10,
            )
            if resp.status_code == 200:
                log.info(f"[{deployment_id}] Rejection reported to backend.")
            else:
                log.warning(f"[{deployment_id}] Backend rejected report with {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            log.warning(f"[{deployment_id}] Failed to report rejection: {e}")
    return report_rejection


# ---------------------------------------------------------------------------
# Started reporter (called by docker_runner via callback)
# ---------------------------------------------------------------------------

def make_started_reporter(node_secret: str):
    """Return a closure that POSTs a start-confirmation to the backend."""
    def report_started(deployment_id: str) -> None:
        try:
            resp = requests.post(
                f"{BACKEND_URL}/agent/report-started",
                json={"deployment_id": deployment_id},
                headers={"Authorization": f"Bearer {node_secret}"},
                timeout=10,
            )
            if resp.status_code == 200:
                log.info(f"[{deployment_id}] Start confirmed to backend.")
            else:
                log.warning(f"[{deployment_id}] Backend rejected start report with {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            log.warning(f"[{deployment_id}] Failed to report start: {e}")
    return report_started


# ---------------------------------------------------------------------------
# Deployment poll + reconcile
# ---------------------------------------------------------------------------

def poll_deployments(node_secret: str) -> None:
    """Fetch desired deployment states from the backend and reconcile Docker."""
    try:
        resp = requests.get(
            f"{BACKEND_URL}/agent/deployments",
            headers={"Authorization": f"Bearer {node_secret}"},
            timeout=15,
        )
        if resp.status_code == 200:
            deployments = resp.json()
            log.info(f"Polling: {len(deployments)} deployment(s) assigned to this node.")
            on_reject = make_reject_reporter(node_secret)
            on_started = make_started_reporter(node_secret)
            docker_runner.reconcile(deployments, on_reject=on_reject, on_started=on_started)
        else:
            log.warning(f"Deployment poll returned {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log.warning(f"Deployment poll failed: {e}")


# ---------------------------------------------------------------------------
# Log push
# ---------------------------------------------------------------------------

def push_container_logs(node_secret: str, deployments: list) -> None:
    """
    For each running deployment, fetch the last 100 log lines from Docker
    and POST them to the backend log store.
    Only pushes logs for deployments that have a local container tracked.
    """
    running = [d for d in deployments if d.get("status") == "running"]
    for dep in running:
        dep_id = dep["deployment_id"]
        lines  = docker_runner.fetch_logs(dep_id, tail=100)
        if not lines:
            continue
        try:
            resp = requests.post(
                f"{BACKEND_URL}/agent/push-logs",
                json={"deployment_id": dep_id, "lines": lines},
                headers={"Authorization": f"Bearer {node_secret}"},
                timeout=15,
            )
            if resp.status_code != 200:
                log.warning(f"[{dep_id}] Log push returned {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            log.warning(f"[{dep_id}] Log push failed: {e}")


# ---------------------------------------------------------------------------
# Metrics push
# ---------------------------------------------------------------------------

def push_container_metrics(node_secret: str, deployments: list) -> None:
    """
    Collect CPU %, memory, and uptime from every locally-running container
    and batch-POST them to the backend metrics store.
    """
    running = [d for d in deployments if d.get("status") == "running"]
    batch: list = []
    for dep in running:
        dep_id = dep["deployment_id"]
        stats  = docker_runner.fetch_container_stats(dep_id)
        if stats is None:
            continue
        batch.append({
            "deployment_id":   dep_id,
            "cpu_percent":     stats["cpu_percent"],
            "memory_mb":       stats["memory_mb"],
            "memory_limit_mb": stats["memory_limit_mb"],
            "uptime_seconds":  stats["uptime_seconds"],
        })

    if not batch:
        return

    try:
        resp = requests.post(
            f"{BACKEND_URL}/agent/push-metrics",
            json={"metrics": batch},
            headers={"Authorization": f"Bearer {node_secret}"},
            timeout=15,
        )
        if resp.status_code != 200:
            log.warning(f"Metrics push returned {resp.status_code}: {resp.text[:100]}")
        else:
            log.debug(f"Metrics pushed for {len(batch)} container(s).")
    except Exception as e:
        log.warning(f"Metrics push failed: {e}")



# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def run_agent(node_id: str, node_secret: str) -> None:
    docker_runner.sync_container_map()
    log.info(f"Agent running for node {node_id}. Ctrl+C to stop.")
    log.info(
        f"Heartbeat every {HEARTBEAT_INTERVAL}s "
        f"| Poll every {POLL_INTERVAL}s "
        f"| Metrics every {METRICS_INTERVAL}s "
        f"| Logs every {LOG_INTERVAL}s"
    )

    last_heartbeat   = 0.0
    last_poll        = 0.0
    last_log_push    = 0.0
    last_metrics     = 0.0
    _last_deployments: list = []  # cache last poll result for auxiliary loops

    while True:
        now = time.monotonic()

        if now - last_heartbeat >= HEARTBEAT_INTERVAL:
            send_heartbeat(node_id, node_secret)
            last_heartbeat = now

        if now - last_poll >= POLL_INTERVAL:
            try:
                resp = requests.get(
                    f"{BACKEND_URL}/agent/deployments",
                    headers={"Authorization": f"Bearer {node_secret}"},
                    timeout=15,
                )
                if resp.status_code == 200:
                    _last_deployments = resp.json()
                    log.info(f"Polling: {len(_last_deployments)} deployment(s) assigned.")
                    on_reject = make_reject_reporter(node_secret)
                    on_started = make_started_reporter(node_secret)
                    docker_runner.reconcile(_last_deployments, on_reject=on_reject, on_started=on_started)
                else:
                    log.warning(f"Deployment poll returned {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                log.warning(f"Deployment poll failed: {e}")
            last_poll = now

        if now - last_log_push >= LOG_INTERVAL and _last_deployments:
            push_container_logs(node_secret, _last_deployments)
            last_log_push = now

        if now - last_metrics >= METRICS_INTERVAL and _last_deployments:
            push_container_metrics(node_secret, _last_deployments)
            last_metrics = now

        time.sleep(5)


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EdgeCloud Node Agent")
    parser.add_argument("--register",   action="store_true", help="Register this node with the backend")
    parser.add_argument("--host-token", type=str,            help="Host JWT token (required for --register)")
    parser.add_argument("--name",       type=str,            help="Node display name")
    parser.add_argument("--yes",        action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()

    if args.register:
        if not args.host_token:
            print("ERROR: --host-token required for registration")
            sys.exit(1)
        register_node(args.host_token, name=args.name, skip_confirm=args.yes)
        sys.exit(0)

    config = load_config()
    if not config:
        print("No node config found. Run: py agent.py --register --host-token YOUR_TOKEN")
        sys.exit(1)

    run_agent(config["node_id"], config["node_secret"])
