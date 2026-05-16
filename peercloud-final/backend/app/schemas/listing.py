from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.listing import ListingStatus

class ListingBase(BaseModel):
    cpu_cores: float
    ram_gb: float
    disk_gb: float
    price_per_hour_cents: int

class ListingCreate(ListingBase):
    node_id: UUID

class ListingUpdate(BaseModel):
    price_per_hour_cents: Optional[int] = None
    status: Optional[ListingStatus] = None

class NodePublicInfo(BaseModel):
    uptime_score: float
    display_name: str
    platform: str
    
    model_config = ConfigDict(from_attributes=True)

class ListingResponse(ListingBase):
    id: UUID
    node_id: UUID
    user_id: UUID
    status: ListingStatus
    created_at: datetime
    node: Optional[NodePublicInfo] = None
    
    model_config = ConfigDict(from_attributes=True)
