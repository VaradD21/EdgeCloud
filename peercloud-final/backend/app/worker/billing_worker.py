import asyncio
from app.worker.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.deployment import Deployment, DeploymentStatus
from app.models.listing import Listing
from app.models.user import User
from app.models.credit_transaction import CreditTransaction, TransactionType
from sqlalchemy import select
from datetime import datetime, timezone

async def _process_billing():
    async with SessionLocal() as db:
        stmt = select(Deployment).where(
            Deployment.status == DeploymentStatus.running
        )
        result = await db.execute(stmt)
        deployments = result.scalars().all()
        
        now = datetime.now(timezone.utc)
        for d in deployments:
            await db.refresh(d, ["listing", "buyer"])
            
            last_bill = d.last_billed_at or d.started_at or now
            elapsed_seconds = (now - last_bill).total_seconds()
            
            if elapsed_seconds < 60:
                continue
                
            cost = (elapsed_seconds / 3600.0) * d.listing.price_per_hour_cents
            cost_cents = int(cost)
            
            if cost_cents >= 1:
                if d.buyer.credit_balance_cents >= cost_cents:
                    d.buyer.credit_balance_cents -= cost_cents
                    
                    host_stmt = select(User).where(User.id == d.listing.user_id)
                    host_res = await db.execute(host_stmt)
                    host = host_res.scalar_one()
                    host.credit_balance_cents += int(cost_cents * 0.9)
                    
                    d.last_billed_at = now
                else:
                    d.status = DeploymentStatus.stopped
            elif d.buyer.credit_balance_cents <= 0:
                d.status = DeploymentStatus.stopped
                
        await db.commit()

@celery_app.task
def process_billing():
    asyncio.run(_process_billing())
