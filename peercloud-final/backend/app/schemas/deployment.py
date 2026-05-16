from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict
from app.models.deployment import SourceType, Runtime, DeploymentStatus

class DeploymentBase(BaseModel):
    name: str
    source_type: SourceType
    source_url: str
    runtime: Runtime
    install_cmd: Optional[str] = None
    start_cmd: str
    port: int
    env_vars: Optional[Dict[str, str]] = None

class DeploymentCreate(DeploymentBase):
    listing_id: UUID

class DeploymentResponse(DeploymentBase):
    id: UUID
    subdomain: str
    status: DeploymentStatus
    
    model_config = ConfigDict(from_attributes=True)

class AssignedWorkload(DeploymentBase):
    id: UUID
    cpu_cores: float
    ram_mb: float
