import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum

class LogStatus(str, enum.Enum):
    online = "online"
    offline = "offline"

class UptimeLog(Base):
    __tablename__ = "uptime_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[LogStatus] = mapped_column(Enum(LogStatus), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    node = relationship("Node", back_populates="uptime_logs")

    __table_args__ = (
        Index("ix_uptime_logs_node_id_recorded_at", "node_id", "recorded_at"),
    )
