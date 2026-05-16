import asyncio
from app.worker.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.node import Node, NodeStatus
from app.models.uptime_log import UptimeLog, LogStatus
from sqlalchemy import select
from datetime import datetime, timezone, timedelta

async def _check_heartbeats():
    async with SessionLocal() as db:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=5)
        
        stmt = select(Node).where(
            Node.status == NodeStatus.online,
            Node.last_heartbeat_at < cutoff
        )
        result = await db.execute(stmt)
        nodes = result.scalars().all()
        
        for n in nodes:
            n.status = NodeStatus.offline
            log = UptimeLog(node_id=n.id, status=LogStatus.offline)
            db.add(log)
            
        await db.commit()

@celery_app.task
def check_heartbeats():
    asyncio.run(_check_heartbeats())
