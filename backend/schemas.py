from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    created_at: datetime
    active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class UserUpdateEmail(BaseModel):
    new_email: EmailStr
    password: str

class UserUpdatePassword(BaseModel):
    old_password: str
    new_password: str

class UserSessionOut(BaseModel):
    session_id: str
    role: str
    email: EmailStr
    active_since: datetime

class NodeCreate(BaseModel):
    name: str
    cpu_total: float
    ram_total: float
    storage_total_gb: float

class NodeOut(BaseModel):
    id: UUID
    host_id: UUID
    name: Optional[str] = None
    cpu_total: float
    cpu_reserved: float
    ram_total: float
    ram_reserved: float
    storage_total_gb: float
    storage_reserved_gb: float
    cpu_usage_percent: Optional[float] = None
    ram_usage_percent: Optional[float] = None
    storage_usage_percent: Optional[float] = None
    status: str
    last_heartbeat: datetime
    max_cpu_percent: float
    max_ram_percent: float
    enabled: bool
    node_secret: Optional[str] = None

    class Config:
        from_attributes = True

class NodeUpdateLimits(BaseModel):
    max_cpu_percent: Optional[float] = None
    max_ram_percent: Optional[float] = None
    enabled: Optional[bool] = None

class HostCreate(BaseModel):
    display_name: str

class HostOut(BaseModel):
    id: UUID
    user_id: UUID
    display_name: str
    rating_score: float
    total_uptime: int
    nodes: List[NodeOut] = []

    class Config:
        from_attributes = True

class NodeHeartbeat(BaseModel):
    node_id: str
    cpu_usage_percent: float
    ram_usage_percent: float
    storage_usage_percent: float

class ListingCreate(BaseModel):
    node_id: str
    cpu_offered: float
    ram_offered_gb: float
    storage_offered_gb: float
    price_per_hour: float

class ListingOut(BaseModel):
    id: str
    host_id: str
    node_id: str
    cpu_offered: float
    ram_offered_gb: float
    storage_offered_gb: float
    price_per_hour: float
    status: str
    host_display_name: Optional[str] = None
    host_rating: Optional[float] = None
    node_status: Optional[str] = None
    reliability_score: Optional[float] = None

    class Config:
        from_attributes = True

class DeploymentCreate(BaseModel):
    listing_id: UUID
    name: str
    docker_image: str
    container_port: int = 80

class DeploymentOut(BaseModel):
    id: UUID
    user_id: UUID
    listing_id: UUID
    node_id: UUID
    name: str
    docker_image: str
    status: str
    subdomain: str
    container_port: int
    cpu_usage: Optional[int] = None
    ram_usage: Optional[int] = None

    class Config:
        from_attributes = True

class CreditTransactionOut(BaseModel):
    id: str
    user_id: str
    amount: float
    description: str
    created_at: datetime
    deployment_id: Optional[str] = None
    node_id: Optional[str] = None
    duration_seconds: Optional[int] = None
    price_per_minute: Optional[float] = None
    balance_after: Optional[float] = None
    cpu_used: Optional[float] = None
    ram_used: Optional[float] = None
    transaction_type: Optional[str] = None

    class Config:
        from_attributes = True
