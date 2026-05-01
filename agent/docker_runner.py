"""
Docker container lifecycle manager for the EdgeCloud agent.

Responsibilities:
- Check local CPU/RAM headroom before launching containers
- Pull images on demand
- Run containers with strict security constraints (no privilege, read-only, capped caps)
- Stop containers on status = "stopped" or "paused"
- Maintain an in-memory mapping of deployment_id → container_id
- Report resource rejections back to the backend via callback
"""
import json
import logging
from typing import Callable, Dict, Optional

import psutil  # already a hard dependency in requirements.txt

log = logging.getLogger("edgecloud.docker")

# Status constants — mirror deployment_status.py on the backend
STATUS_RUNNING    = "running"
STATUS_RESTARTING = "restarting"
STATUS_PAUSED     = "paused"
STATUS_STOPPED    = "stopped"
STATUS_FAILED     = "failed"

# Statuses where the container must NOT run locally
INACTIVE_STATUSES = {STATUS_PAUSED, STATUS_STOPPED, STATUS_FAILED}

try:
    import docker
    from docker.errors import ImageNotFound, APIError, NotFound
    _docker_available = True
except ImportError:
    _docker_available = False

# Per-process mapping: deployment_id → container_id
_container_map: Dict[str, str] = {}

# GB → bytes
_GB = 1024 ** 3

# Safety headroom: never consume the last N% of CPU / GB of RAM
_CPU_HEADROOM_PCT = 10   # leave 10 % of CPU cores free
_RAM_HEADROOM_GB  = 0.25 # always keep 256 MB free for the OS


def _client() -> "docker.DockerClient":
    if not _docker_available:
        raise RuntimeError("docker SDK not installed. Run: pip install docker")
    return docker.from_env()


def _parse_env_vars(raw: Optional[str]) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _get_container(client: "docker.DockerClient", container_id: str):
    try:
        return client.containers.get(container_id)
    except NotFound:
        return None
    except APIError as e:
        log.warning(f"Docker API error fetching container {container_id}: {e}")
        return None


def _is_running(client: "docker.DockerClient", container_id: str) -> bool:
    container = _get_container(client, container_id)
    return container is not None and container.status == "running"

def sync_container_map():
    """Populate _container_map with existing edgecloud containers on startup."""
    try:
        client = _client()
        containers = client.containers.list(all=True, filters={"label": "edgecloud.deployment_id"})
        for c in containers:
            dep_id = c.labels.get("edgecloud.deployment_id")
            if dep_id:
                _container_map[dep_id] = c.id
        log.info(f"Synced {len(_container_map)} existing containers into memory.")
    except Exception as e:
        log.warning(f"Failed to sync existing containers: {e}")

# ---------------------------------------------------------------------------
# Resource pre-flight check
# ---------------------------------------------------------------------------

def check_local_resources(cpu_needed: float, ram_needed_gb: float) -> tuple[bool, str, float, float]:
    """
    Measure current host availability and compare against the requested resources.

    Returns:
        (ok, reason, available_cpu, available_ram_gb)
        ok is True only when the host can safely honour the request.
    """
    # CPU: psutil returns % used; convert to available logical cores
    cpu_used_pct  = psutil.cpu_percent(interval=0.5)
    total_cores   = psutil.cpu_count(logical=True) or 1
    available_cpu = total_cores * (1 - cpu_used_pct / 100.0)
    usable_cpu    = max(0.0, available_cpu - total_cores * _CPU_HEADROOM_PCT / 100.0)

    # RAM: free + buffers/cache (available to new processes)
    mem            = psutil.virtual_memory()
    available_ram  = mem.available / _GB
    usable_ram     = max(0.0, available_ram - _RAM_HEADROOM_GB)

    if usable_cpu < cpu_needed:
        reason = (
            f"Insufficient CPU: need {cpu_needed:.1f} cores, "
            f"only {usable_cpu:.2f} usable (total available={available_cpu:.2f})"
        )
        return False, reason, round(available_cpu, 2), round(available_ram, 2)

    if usable_ram < ram_needed_gb:
        reason = (
            f"Insufficient RAM: need {ram_needed_gb:.2f}GB, "
            f"only {usable_ram:.2f}GB usable (total available={available_ram:.2f}GB)"
        )
        return False, reason, round(available_cpu, 2), round(available_ram, 2)

    return True, "", round(available_cpu, 2), round(available_ram, 2)


# ---------------------------------------------------------------------------
# Container lifecycle
# ---------------------------------------------------------------------------

def start_deployment(
    deployment_id: str,
    image: str,
    cpu_limit: float,
    ram_limit_gb: float,
    env_vars_raw: Optional[str],
    on_reject: Optional[Callable[[str, str, float, float], None]] = None,
) -> Optional[str]:
    """
    Check local resources, pull image, and start a sandboxed container.

    Security constraints applied to every container (non-negotiable):
    - --cpus: fractional CPU limit
    - --memory: hard RAM limit
    - --pids-limit=100: prevent fork bombs
    - --read-only: immutable rootfs
    - --cap-drop=ALL: drop all Linux capabilities
    - privileged=False always

    on_reject(deployment_id, reason, available_cpu, available_ram_gb) is called
    if the resource pre-flight fails so the caller can report back to the backend.

    Returns container ID on success, None on failure.
    """
    try:
        client = _client()
    except RuntimeError as e:
        log.error(str(e))
        return None

    # Already running locally — no-op
    existing_id = _container_map.get(deployment_id)
    if existing_id and _is_running(client, existing_id):
        log.debug(f"[{deployment_id}] Container {existing_id[:12]} already running.")
        return existing_id

    # --- Resource pre-flight ---
    ok, reason, avail_cpu, avail_ram = check_local_resources(cpu_limit, ram_limit_gb)
    if not ok:
        log.warning(f"[{deployment_id}] Rejected: {reason}")
        if on_reject:
            on_reject(deployment_id, reason, avail_cpu, avail_ram)
        return None

    log.info(f"[{deployment_id}] Pulling image: {image}")
    try:
        client.images.pull(image)
    except ImageNotFound:
        log.error(f"[{deployment_id}] Image not found: {image}")
        return None
    except APIError as e:
        log.error(f"[{deployment_id}] Failed to pull {image}: {e}")
        return None

    env       = _parse_env_vars(env_vars_raw)
    ram_bytes = int(ram_limit_gb * _GB)
    nano_cpus = int(cpu_limit * 1e9)

    log.info(f"[{deployment_id}] Starting container | CPU={cpu_limit} RAM={ram_limit_gb}GB")
    try:
        container = client.containers.run(
            image,
            detach=True,
            name=f"ec-{deployment_id[:12]}",
            environment=env,
            nano_cpus=nano_cpus,
            mem_limit=ram_bytes,
            pids_limit=100,
            read_only=True,
            cap_drop=["ALL"],
            privileged=False,
            tmpfs={"/tmp": "size=64m,mode=1777"},
            auto_remove=False,
            labels={"edgecloud.deployment_id": deployment_id},
        )
        _container_map[deployment_id] = container.id
        log.info(f"[{deployment_id}] Started → {container.id[:12]}")
        return container.id
    except APIError as e:
        log.error(f"[{deployment_id}] Failed to start container: {e}")
        return None


def stop_deployment(deployment_id: str) -> bool:
    """Stop and remove the container for a deployment. Returns True on success."""
    container_id = _container_map.get(deployment_id)
    if not container_id:
        log.debug(f"[{deployment_id}] No container tracked locally, nothing to stop.")
        return True

    try:
        client = _client()
    except RuntimeError as e:
        log.error(str(e))
        return False

    container = _get_container(client, container_id)
    if container is None:
        _container_map.pop(deployment_id, None)
        return True

    try:
        if container.status == "running":
            container.stop(timeout=10)
            log.info(f"[{deployment_id}] Stopped container {container_id[:12]}")
        container.remove(force=False)
        log.info(f"[{deployment_id}] Removed container {container_id[:12]}")
    except APIError as e:
        log.error(f"[{deployment_id}] Failed to stop/remove {container_id[:12]}: {e}")
        return False
    finally:
        _container_map.pop(deployment_id, None)

    return True


def fetch_logs(deployment_id: str, tail: int = 100) -> list[str]:
    """
    Fetch the last `tail` lines of stdout+stderr from the container.
    Returns an empty list if the container is not tracked or Docker is unavailable.
    """
    container_id = _container_map.get(deployment_id)
    if not container_id:
        return []

    try:
        client = _client()
    except RuntimeError:
        return []

    container = _get_container(client, container_id)
    if container is None:
        return []

    try:
        raw = container.logs(stdout=True, stderr=True, tail=tail, timestamps=True)
        lines = raw.decode("utf-8", errors="replace").splitlines()
        return [l for l in lines if l.strip()]  # drop blank lines
    except APIError as e:
        log.warning(f"[{deployment_id}] Failed to fetch logs: {e}")
        return []


def fetch_container_stats(deployment_id: str) -> Optional[dict]:
    """
    Return a snapshot of CPU %, memory usage, and uptime for the container.

    CPU % uses the same delta calculation as `docker stats`:
        cpu_delta  = cpu_total_usage[i] - cpu_total_usage[i-1]
        sys_delta  = system_cpu_usage[i] - system_cpu_usage[i-1]
        cpu_pct    = (cpu_delta / sys_delta) * num_cpus * 100

    Returns None if the container is not tracked, not running, or Docker is unavailable.
    """
    container_id = _container_map.get(deployment_id)
    if not container_id:
        return None

    try:
        client = _client()
    except RuntimeError:
        return None

    container = _get_container(client, container_id)
    if container is None or container.status != "running":
        return None

    try:
        s = container.stats(stream=False)  # single-shot, no blocking

        # CPU %
        cpu_delta = (
            s["cpu_stats"]["cpu_usage"]["total_usage"]
            - s["precpu_stats"]["cpu_usage"]["total_usage"]
        )
        system_delta = (
            s["cpu_stats"].get("system_cpu_usage", 0)
            - s["precpu_stats"].get("system_cpu_usage", 0)
        )
        num_cpus = s["cpu_stats"].get("online_cpus") or len(
            s["cpu_stats"]["cpu_usage"].get("percpu_usage", [1])
        )
        cpu_pct = 0.0
        if system_delta > 0 and cpu_delta >= 0:
            cpu_pct = (cpu_delta / system_delta) * num_cpus * 100.0

        # Memory
        mem_usage = s["memory_stats"].get("usage", 0)
        mem_limit = s["memory_stats"].get("limit", 1)
        # Subtract page-cache so we match what docker stats shows
        cache     = s["memory_stats"].get("stats", {}).get("cache", 0)
        mem_usage = max(0, mem_usage - cache)

        # Uptime — compare container's StartedAt with now
        import re
        from datetime import datetime, timezone
        started_raw = container.attrs.get("State", {}).get("StartedAt", "")
        uptime_secs = 0
        if started_raw:
            # Docker returns RFC3339 with nanoseconds, e.g. "2024-01-01T12:00:00.123456789Z"
            # Truncate nanoseconds to microseconds for fromisoformat compatibility
            started_clean = re.sub(r"(\.\d{6})\d*Z$", r"\1+00:00", started_raw)
            try:
                started_dt = datetime.fromisoformat(started_clean)
                uptime_secs = int(
                    (datetime.now(timezone.utc) - started_dt).total_seconds()
                )
            except ValueError:
                pass

        return {
            "cpu_percent":     round(cpu_pct, 2),
            "memory_mb":       round(mem_usage / (1024 ** 2), 2),
            "memory_limit_mb": round(mem_limit / (1024 ** 2), 2),
            "uptime_seconds":  max(0, uptime_secs),
        }

    except (APIError, KeyError, ZeroDivisionError) as e:
        log.debug(f"[{deployment_id}] Stats unavailable: {e}")
        return None


# ---------------------------------------------------------------------------
# Reconciliation loop
# ---------------------------------------------------------------------------

def reconcile(
    deployments: list,
    on_reject: Optional[Callable[[str, str, float, float], None]] = None,
    on_started: Optional[Callable[[str], None]] = None,
) -> None:
    """
    Compare backend deployment states against local Docker reality.
    Called every polling cycle.

    Rules:
    - status "running"                     → resource-check, ensure container is running
    - status "paused"/"stopped"/"failed"  → stop + remove container immediately
    - Any other status                     → ignore (transient, e.g. 'starting')

    active_ids tracks deployments we manage this cycle to avoid orphan-cleanup
    double-stopping containers that were already handled in the main loop.
    """
    managed_ids: set[str] = set()  # all dep_ids handled this cycle (running OR stopped)

    for dep in deployments:
        dep_id         = dep["deployment_id"]
        desired_status = dep["status"]
        managed_ids.add(dep_id)

        if desired_status in (STATUS_RUNNING, STATUS_RESTARTING):
            container_id = start_deployment(
                deployment_id=dep_id,
                image=dep["docker_image"],
                cpu_limit=dep["cpu_limit"],
                ram_limit_gb=dep["ram_limit"],
                env_vars_raw=dep.get("env_vars"),
                on_reject=on_reject,
            )
            if container_id is None:
                log.error(f"[{dep_id}] Could not start container.")
            elif desired_status == STATUS_RESTARTING and on_started:
                # Successfully started a restarting container, report back to clear restarting state
                on_started(dep_id)

        elif desired_status in INACTIVE_STATUSES:
            # Backend says this deployment should NOT have a running container.
            # Stop it if we have one tracked. If it's already absent, no-op.
            if dep_id in _container_map:
                log.info(f"[{dep_id}] Backend status={desired_status!r}; stopping local container.")
                stop_deployment(dep_id)

    # Orphan cleanup: stop containers for deployment_ids the backend no longer
    # returns at all (e.g. deleted). We skip managed_ids to avoid double-stop.
    for dep_id in list(_container_map.keys()):
        if dep_id not in managed_ids:
            log.info(f"[{dep_id}] No longer in backend list; stopping orphan container.")
            stop_deployment(dep_id)
