from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.node import Node, NodeStatus
from app.models.deployment import Deployment, DeploymentStatus
from app.models.uptime_log import UptimeLog, LogStatus
from app.models.deployment_log import DeploymentLog
from app.schemas.node import NodeCreate, HeartbeatRequest, PushLogsRequest, PushStatsRequest
from app.core.security import generate_node_secret, hash_node_secret
from datetime import datetime, timezone
import uuid
import json
import redis.asyncio as redis
from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL)

async def register_node(db: AsyncSession, user_id: uuid.UUID, node_in: NodeCreate) -> tuple[uuid.UUID, str]:
    plain_secret = generate_node_secret()
    hashed_secret = hash_node_secret(plain_secret)
    
    db_node = Node(
        user_id=user_id,
        display_name=node_in.display_name,
        node_secret=hashed_secret,
        cpu_cores_total=node_in.cpu_cores_total,
        ram_gb_total=node_in.ram_gb_total,
        disk_gb_total=node_in.disk_gb_total,
        price_per_hour_cents=node_in.price_per_hour_cents,
        platform=node_in.platform,
        agent_version=node_in.agent_version
    )
    db.add(db_node)
    await db.commit()
    await db.refresh(db_node)
    
    return db_node.id, plain_secret

async def process_heartbeat(db: AsyncSession, node: Node, req: HeartbeatRequest) -> list[dict]:
    if node.status != NodeStatus.online:
        uptime_log = UptimeLog(node_id=node.id, status=LogStatus.online)
        db.add(uptime_log)
        
    node.last_heartbeat_at = datetime.now(timezone.utc)
    node.status = NodeStatus.online
    await db.commit()
    
    stmt = select(Deployment).where(
        Deployment.node_id == node.id,
        Deployment.status.notin_([DeploymentStatus.stopped, DeploymentStatus.failed])
    )
    result = await db.execute(stmt)
    deployments = result.scalars().all()
    
    workloads = []
    for d in deployments:
        await db.refresh(d, ["listing"])
        workloads.append({
            "id": str(d.id),
            "source_type": d.source_type,
            "source_url": d.source_url,
            "runtime": d.runtime,
            "install_cmd": d.install_cmd,
            "start_cmd": d.start_cmd,
            "port": d.port,
            "env_vars": d.env_vars or {},
            "cpu_cores": d.listing.cpu_cores if d.listing else 1.0,
            "ram_mb": d.listing.ram_gb * 1024 if d.listing else 512.0
        })
        
    return workloads

async def push_logs(db: AsyncSession, req: PushLogsRequest):
    if not req.lines:
        return
    key = f"logs:{req.deployment_id}"
    await redis_client.rpush(key, *req.lines)
    await redis_client.ltrim(key, -500, -1)
    
    logs = [DeploymentLog(deployment_id=req.deployment_id, line=line) for line in req.lines]
    db.add_all(logs)
    await db.commit()

async def push_stats(req: PushStatsRequest):
    key = f"stats:{req.deployment_id}"
    stat_entry = json.dumps({
        "cpu_percent": req.cpu_percent,
        "ram_mb_used": req.ram_mb_used,
        "timestamp": req.timestamp.isoformat()
    })
    await redis_client.rpush(key, stat_entry)
    await redis_client.ltrim(key, -120, -1)
