"""
In-memory store for per-deployment container metrics.

Metrics are pushed by the agent every N seconds and held in a flat dict.
The WebSocket broadcaster reads directly from here — no DB round-trips.
"""
from typing import Dict, Optional
from datetime import datetime

# deployment_id → latest metrics snapshot
_store: Dict[str, dict] = {}


def push(deployment_id: str, metrics: dict) -> None:
    """Store or overwrite the latest metrics for a deployment."""
    _store[deployment_id] = {**metrics, "updated_at": datetime.utcnow().isoformat()}


def get(deployment_id: str) -> Optional[dict]:
    """Return the latest snapshot, or None if never received."""
    return _store.get(deployment_id)


def get_all() -> Dict[str, dict]:
    """Return a shallow copy of the full metrics store."""
    return dict(_store)


def clear(deployment_id: str) -> None:
    """Evict metrics for a deleted or stopped deployment."""
    _store.pop(deployment_id, None)
