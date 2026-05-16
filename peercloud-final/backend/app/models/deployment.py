import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum

class SourceType(str, enum.Enum):
    github = "github"
    package = "package"

class Runtime(str, enum.Enum):
    python = "python"
    node = "node"
    binary = "binary"
    static = "static"

class DeploymentStatus(str, enum.Enum):
    pending = "pending"
    cloning = "cloning"
    installing = "installing"
    running = "running"
    stopped = "stopped"
    failed = "failed"

class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    listing_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("listings.id", ondelete="SET NULL"), nullable=True)
    node_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), nullable=False)
    source_url: Mapped[str] = mapped_column(String, nullable=False)
    runtime: Mapped[Runtime] = mapped_column(Enum(Runtime), nullable=False)
    install_cmd: Mapped[str | None] = mapped_column(String, nullable=True)
    start_cmd: Mapped[str] = mapped_column(String, nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    env_vars: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    subdomain: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    status: Mapped[DeploymentStatus] = mapped_column(Enum(DeploymentStatus), default=DeploymentStatus.pending, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_billed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    buyer = relationship("User", back_populates="deployments")
    listing = relationship("Listing", back_populates="deployments")
    node = relationship("Node", back_populates="deployments")
    transactions = relationship("CreditTransaction", back_populates="deployment")
    logs = relationship("DeploymentLog", back_populates="deployment", cascade="all, delete-orphan")
