import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum

class NodeStatus(str, enum.Enum):
    online = "online"
    offline = "offline"
    maintenance = "maintenance"

class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    node_secret: Mapped[str] = mapped_column(String, nullable=False)
    cpu_cores_total: Mapped[float] = mapped_column(Float, nullable=False)
    cpu_cores_reserved: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    ram_gb_total: Mapped[float] = mapped_column(Float, nullable=False)
    ram_gb_reserved: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    disk_gb_total: Mapped[float] = mapped_column(Float, nullable=False)
    disk_gb_reserved: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    price_per_hour_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    uptime_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    status: Mapped[NodeStatus] = mapped_column(Enum(NodeStatus), default=NodeStatus.offline, nullable=False)
    last_heartbeat_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    platform: Mapped[str] = mapped_column(String, nullable=False)
    agent_version: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="nodes")
    listings = relationship("Listing", back_populates="node", cascade="all, delete-orphan")
    deployments = relationship("Deployment", back_populates="node")
    uptime_logs = relationship("UptimeLog", back_populates="node", cascade="all, delete-orphan")
