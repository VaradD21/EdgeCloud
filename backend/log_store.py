"""
In-memory log store for deployment container logs.

Intentionally ephemeral — logs survive process lifetime only.
Capped at MAX_LINES per deployment to bound memory usage.
"""
from collections import deque
from typing import Dict, Deque, List

MAX_LINES = 100

# deployment_id → deque of log lines (most-recent last)
_store: Dict[str, Deque[str]] = {}


def push(deployment_id: str, lines: List[str]) -> None:
    """Append lines to the ring buffer for a deployment."""
    if deployment_id not in _store:
        _store[deployment_id] = deque(maxlen=MAX_LINES)
    buf = _store[deployment_id]
    for line in lines:
        stripped = line.rstrip("\n\r")
        if stripped:  # skip blank lines
            buf.append(stripped)


def get(deployment_id: str) -> List[str]:
    """Return the current log buffer (oldest first). Empty list if never received."""
    buf = _store.get(deployment_id)
    return list(buf) if buf else []


def clear(deployment_id: str) -> None:
    """Evict logs for a deleted or stopped deployment."""
    _store.pop(deployment_id, None)
