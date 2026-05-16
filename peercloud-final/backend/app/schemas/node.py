from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class NodeCreate(BaseModel):
    display_name: str
    cpu_cores_total: float
    ram_gb_total: float
    disk_gb_total: float
    price_per_hour_cents: int
    platform: str
    agent_version: str

class NodeRegisterResponse(BaseModel):
    node_id: UUID
    node_secret: str

class HeartbeatRequest(BaseModel):
    node_id: UUID
    cpu_percent: float
    ram_gb_used: float

class PushLogsRequest(BaseModel):
    deployment_id: UUID
    lines: list[str]

class PushStatsRequest(BaseModel):
    deployment_id: UUID
    cpu_percent: float
    ram_mb_used: float
    timestamp: datetime
