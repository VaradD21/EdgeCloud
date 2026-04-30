import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False) # 'buyer' or 'host'
    created_at = Column(DateTime, default=datetime.utcnow)

    host = relationship("Host", back_populates="user", uselist=False)

class Host(Base):
    __tablename__ = "hosts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    rating_score = Column(Float, default=0.0)
    total_uptime = Column(Integer, default=0)

    user = relationship("User", back_populates="host")
    nodes = relationship("Node", back_populates="host")

class Node(Base):
    __tablename__ = "nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    host_id = Column(UUID(as_uuid=True), ForeignKey("hosts.id"), nullable=False)
    cpu_total = Column(Float, nullable=False)
    cpu_reserved = Column(Float, default=0.0)
    ram_total = Column(Float, nullable=False)
    ram_reserved = Column(Float, default=0.0)
    status = Column(String, default="online")
    last_heartbeat = Column(DateTime, default=datetime.utcnow)

    host = relationship("Host", back_populates="nodes")

class Listing(Base):
    __tablename__ = "listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    host_id = Column(UUID(as_uuid=True), ForeignKey("hosts.id"), nullable=False)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=False)
    cpu = Column(Float, nullable=False)
    ram = Column(Float, nullable=False)
    price_per_hour = Column(Float, nullable=False)
    status = Column(String, default="active")

    host = relationship("Host")
    node = relationship("Node")

class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=False)
    name = Column(String, nullable=False)
    docker_image = Column(String, nullable=False)
    status = Column(String, default="running")
    subdomain = Column(String, nullable=False)

    user = relationship("User")
    listing = relationship("Listing")
    node = relationship("Node")
