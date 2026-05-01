from pydantic import BaseModel
from typing import List, Optional


class AgentDeploymentOut(BaseModel):
    """Deployment payload returned to the agent for execution."""
    deployment_id: str
    docker_image: str
    cpu_limit: float
    ram_limit: float
    env_vars: Optional[str] = None  # Raw JSON string; agent parses it
    status: str
    restart_policy: str

    class Config:
        from_attributes = True


class AgentRejectionReport(BaseModel):
    """Posted by the agent when it cannot fulfil a deployment due to insufficient local resources."""
    deployment_id: str
    reason: str            # Human-readable explanation
    available_cpu: float   # Actual free CPU on the node at rejection time
    available_ram_gb: float


class AgentStartedReport(BaseModel):
    """Posted by the agent to confirm it successfully started a restarting deployment."""
    deployment_id: str


class AgentLogPush(BaseModel):
    """Posted by the agent with the latest container log lines."""
    deployment_id: str
    lines: List[str]  # up to 100 lines, oldest first


class AgentContainerMetric(BaseModel):
    """Per-container stats snapshot."""
    deployment_id: str
    cpu_percent: float      # 0-100
    memory_mb: float        # MB currently used
    memory_limit_mb: float  # container's hard limit
    uptime_seconds: int     # seconds since container started


class AgentMetricsPush(BaseModel):
    """Batch of container metrics pushed by the agent each heartbeat cycle."""
    metrics: List[AgentContainerMetric]
