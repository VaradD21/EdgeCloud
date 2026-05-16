from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.deployment import Deployment, DeploymentStatus
from app.models.listing import Listing, ListingStatus
from app.models.node import Node
from app.models.user import User
from app.schemas.deployment import DeploymentCreate
from datetime import datetime, timezone
import uuid
import secrets
import json
import redis.asyncio as redis
from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL)

async def create_deployment(db: AsyncSession, buyer: User, deployment_in: DeploymentCreate) -> Deployment:
    # 1. Check buyer has enough credits for at least 1 hour of the listing
    listing = await db.execute(select(Listing).where(Listing.id == deployment_in.listing_id))
    listing = listing.scalar_one_or_none()
    if not listing or listing.status != ListingStatus.active:
        raise HTTPException(status_code=400, detail="Invalid or inactive listing")
        
    if buyer.credit_balance_cents < listing.price_per_hour_cents:
        raise HTTPException(status_code=402, detail="Insufficient credits for 1 hour")
        
    # 2. Check node has enough available capacity
    node = await db.execute(select(Node).where(Node.id == listing.node_id))
    node = node.scalar_one_or_none()
    
    available_cpu = node.cpu_cores_total - node.cpu_cores_reserved
    available_ram = node.ram_gb_total - node.ram_gb_reserved
    
    if listing.cpu_cores > available_cpu or listing.ram_gb > available_ram:
        raise HTTPException(status_code=400, detail="Node capacity exceeded")
        
    # 3. Reserve capacity
    node.cpu_cores_reserved += listing.cpu_cores
    node.ram_gb_reserved += listing.ram_gb
    
    import random
    adjectives = ["cool", "fast", "brave", "smart"]
    nouns = ["dog", "cat", "bird", "fish"]
    
    while True:
        subdomain = f"{random.choice(adjectives)}-{random.choice(nouns)}-{secrets.token_hex(2)}.peercloud.app"
        existing = await db.execute(select(Deployment).where(Deployment.subdomain == subdomain))
        if not existing.scalar_one_or_none():
            break
    
    # 5. Create deployment
    deployment = Deployment(
        buyer_id=buyer.id,
        listing_id=listing.id,
        node_id=node.id,
        name=deployment_in.name,
        source_type=deployment_in.source_type,
        source_url=deployment_in.source_url,
        runtime=deployment_in.runtime,
        install_cmd=deployment_in.install_cmd,
        start_cmd=deployment_in.start_cmd,
        port=deployment_in.port,
        env_vars=deployment_in.env_vars,
        subdomain=subdomain,
        status=DeploymentStatus.pending,
        last_billed_at=datetime.now(timezone.utc)
    )
    
    db.add(deployment)
    await db.commit()
    await db.refresh(deployment)
    return deployment

async def get_deployments(db: AsyncSession, buyer_id: uuid.UUID):
    result = await db.execute(select(Deployment).where(Deployment.buyer_id == buyer_id))
    return result.scalars().all()

async def get_deployment(db: AsyncSession, deployment_id: uuid.UUID, buyer_id: uuid.UUID):
    result = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
    deployment = result.scalar_one_or_none()
    if not deployment or deployment.buyer_id != buyer_id:
        raise HTTPException(status_code=404, detail="Not found")
    return deployment

async def stop_deployment(db: AsyncSession, deployment_id: uuid.UUID, buyer_id: uuid.UUID):
    deployment = await get_deployment(db, deployment_id, buyer_id)
    if deployment.status != DeploymentStatus.stopped:
        deployment.status = DeploymentStatus.stopped
        
        if deployment.node_id and deployment.listing_id:
            node = await db.execute(select(Node).where(Node.id == deployment.node_id))
            node = node.scalar_one_or_none()
            listing = await db.execute(select(Listing).where(Listing.id == deployment.listing_id))
            listing = listing.scalar_one_or_none()
            
            if node and listing:
                node.cpu_cores_reserved = max(0, node.cpu_cores_reserved - listing.cpu_cores)
                node.ram_gb_reserved = max(0, node.ram_gb_reserved - listing.ram_gb)
                
    await db.commit()
    
async def get_logs(deployment_id: uuid.UUID) -> list[str]:
    key = f"logs:{deployment_id}"
    logs = await redis_client.lrange(key, 0, -1)
    return [log.decode('utf-8') for log in logs]

async def get_stats(deployment_id: uuid.UUID) -> list[dict]:
    key = f"stats:{deployment_id}"
    stats_raw = await redis_client.lrange(key, 0, -1)
    return [json.loads(stat.decode('utf-8')) for stat in stats_raw]
