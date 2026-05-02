"""
In-memory log store for deployment container logs.

Intentionally ephemeral — logs survive process lifetime only.
Capped at MAX_LINES per deployment to bound memory usage.
"""
from collections import deque
from typing import Dict, Deque, List

MAX_LINES = 100

# deployment_id → list of log lines
_store: Dict[str, List[str]] = {}

def set_logs(deployment_id: str, lines: List[str]) -> None:
    """Overwrite the log buffer for a deployment (used when agent sends tail=100)."""
    _store[deployment_id] = [line.rstrip("\n\r") for line in lines if line.rstrip("\n\r")]


def get(deployment_id: str) -> List[str]:
    """Return the current log buffer. Empty list if never received."""
    return _store.get(deployment_id, [])


def clear(deployment_id: str) -> None:
    """Evict logs for a deleted or stopped deployment."""
    _store.pop(deployment_id, None)
