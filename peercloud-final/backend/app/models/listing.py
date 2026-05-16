import uuid
from datetime import datetime, timezone
from sqlalchemy import Float, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum

class ListingStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    deleted = "deleted"

class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cpu_cores: Mapped[float] = mapped_column(Float, nullable=False)
    ram_gb: Mapped[float] = mapped_column(Float, nullable=False)
    disk_gb: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_hour_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ListingStatus] = mapped_column(Enum(ListingStatus), default=ListingStatus.active, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    node = relationship("Node", back_populates="listings")
    user = relationship("User", back_populates="listings")
    deployments = relationship("Deployment", back_populates="listing")
