import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False) # 'buyer' or 'host'
    credit_balance = Column(Float, default=10.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    active = Column(Boolean, default=True)

    host = relationship("Host", back_populates="user", uselist=False)
    transactions = relationship("CreditTransaction", back_populates="user", cascade="all, delete-orphan")

class Host(Base):
    __tablename__ = "hosts"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    rating_score = Column(Float, default=0.0)
    total_uptime = Column(Integer, default=0)
    total_uptime_seconds = Column(Float, default=0.0)

    user = relationship("User", back_populates="host")
    nodes = relationship("Node", back_populates="host")

class Node(Base):
    __tablename__ = "nodes"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    host_id = Column(String, ForeignKey("hosts.id"), nullable=False)
    name = Column(String, nullable=True)
    node_secret = Column(String, nullable=True)
    cpu_total = Column(Float, nullable=False)
    cpu_reserved = Column(Float, default=0.0)
    ram_total = Column(Float, nullable=False)
    ram_reserved = Column(Float, default=0.0)
    storage_total_gb = Column(Float, default=0.0)
    storage_reserved_gb = Column(Float, default=0.0)
    cpu_usage_percent = Column(Float, nullable=True)
    ram_usage_percent = Column(Float, nullable=True)
    storage_usage_percent = Column(Float, nullable=True)
    status = Column(String, default="online")
    max_cpu_percent = Column(Float, default=100.0)
    max_ram_percent = Column(Float, default=100.0)
    enabled = Column(Boolean, default=True)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)

    host = relationship("Host", back_populates="nodes")

class Listing(Base):
    __tablename__ = "listings"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    host_id = Column(String, ForeignKey("hosts.id"), nullable=False)
    node_id = Column(String, ForeignKey("nodes.id"), nullable=False)
    cpu_offered = Column(Float, nullable=False)
    ram_offered_gb = Column(Float, nullable=False)
    storage_offered_gb = Column(Float, default=0.0)
    price_per_hour = Column(Float, nullable=False)
    status = Column(String, default="active")

    host = relationship("Host")
    node = relationship("Node")

class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    listing_id = Column(String, ForeignKey("listings.id"), nullable=False)
    node_id = Column(String, ForeignKey("nodes.id"), nullable=False)
    name = Column(String, nullable=False)
    docker_image = Column(String, nullable=False)
    status = Column(String, default="running")
    subdomain = Column(String, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    last_billed_at = Column(DateTime, nullable=True)
    total_cost = Column(Float, default=0.0)
    env_vars = Column(Text, nullable=True)  # JSON string
    restart_policy = Column(String, default="on-failure")
    restart_count = Column(Integer, default=0)
    last_error = Column(String, nullable=True)
    container_port = Column(Integer, default=80)

    user = relationship("User")
    listing = relationship("Listing")
    node = relationship("Node")

class CreditTransaction(Base):
    __tablename__ = "credit_transactions"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # New per-minute billing fields (nullable for backwards compatibility)
    deployment_id = Column(String, nullable=True)
    node_id = Column(String, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    price_per_minute = Column(Float, nullable=True)
    balance_after = Column(Float, nullable=True)
    cpu_used = Column(Float, nullable=True)
    ram_used = Column(Float, nullable=True)
    transaction_type = Column(String, nullable=True)

    user = relationship("User", back_populates="transactions")
