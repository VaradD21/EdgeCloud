"""
Centralised status enum for Deployment.

Single source of truth — imported by both models and API endpoints
so status strings never diverge between backend and agent.
"""
from enum import Enum


class DeploymentStatus(str, Enum):
    running  = "running"
    paused   = "paused"
    stopped  = "stopped"
    failed   = "failed"

    # Transient states (set internally, not via user API)
    starting   = "starting"
    stopping   = "stopping"
    restarting = "restarting"


# Statuses where the container MUST be running on the host
ACTIVE_STATUSES = {DeploymentStatus.running, DeploymentStatus.restarting}

# Statuses where the container MUST NOT be running on the host
INACTIVE_STATUSES = {
    DeploymentStatus.paused,
    DeploymentStatus.stopped,
    DeploymentStatus.failed,
    DeploymentStatus.stopping,
}

# Statuses a user is allowed to transition FROM when calling /start
STARTABLE_FROM = {DeploymentStatus.stopped, DeploymentStatus.paused}

# Statuses a user is allowed to transition FROM when calling /stop
STOPPABLE_FROM = {DeploymentStatus.running, DeploymentStatus.paused}
