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

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class NodeCreate(BaseModel):
    cpu_total: float
    ram_total: float

class NodeOut(BaseModel):
    id: UUID
    host_id: UUID
    cpu_total: float
    cpu_reserved: float
    ram_total: float
    ram_reserved: float
    status: str
    last_heartbeat: datetime

    class Config:
        from_attributes = True

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
    node_id: UUID
    cpu_usage: float
    ram_usage: float

class ListingCreate(BaseModel):
    node_id: UUID
    cpu: float
    ram: float
    price_per_hour: float

class ListingOut(BaseModel):
    id: UUID
    host_id: UUID
    node_id: UUID
    cpu: float
    ram: float
    price_per_hour: float
    status: str
    host_display_name: Optional[str] = None
    host_rating: Optional[float] = None
    node_status: Optional[str] = None

    class Config:
        from_attributes = True

class DeploymentCreate(BaseModel):
    listing_id: UUID
    name: str
    docker_image: str

class DeploymentOut(BaseModel):
    id: UUID
    user_id: UUID
    listing_id: UUID
    node_id: UUID
    name: str
    docker_image: str
    status: str
    subdomain: str

    class Config:
        from_attributes = True
