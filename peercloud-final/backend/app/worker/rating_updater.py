import asyncio
from app.worker.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.node import Node
from app.models.uptime_log import UptimeLog, LogStatus
from sqlalchemy import select
from datetime import datetime, timezone, timedelta

async def _update_ratings():
    async with SessionLocal() as db:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=30)
        
        stmt = select(Node)
        result = await db.execute(stmt)
        nodes = result.scalars().all()
        
        for n in nodes:
            logs_stmt = select(UptimeLog).where(
                UptimeLog.node_id == n.id,
                UptimeLog.timestamp >= cutoff
            )
            logs_result = await db.execute(logs_stmt)
            logs = logs_result.scalars().all()
            
            if not logs:
                continue
                
            total = len(logs)
            online = sum(1 for log in logs if log.status == LogStatus.online)
            n.uptime_score = (online / total) * 100.0
            
        await db.commit()

@celery_app.task
def update_ratings():
    asyncio.run(_update_ratings())
