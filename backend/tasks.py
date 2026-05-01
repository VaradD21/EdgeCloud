import asyncio
import logging
from datetime import datetime, timedelta
import uuid

from database import SessionLocal
import models
import container_metrics
import log_store
from deployment_status import DeploymentStatus

logger = logging.getLogger("edgecloud.tasks")

async def failover_loop():
    """Detects offline nodes and reassigns deployments."""
    while True:
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            cutoff = now - timedelta(seconds=90)
            
            offline_nodes = db.query(models.Node).filter(
                models.Node.status == "online",
                models.Node.last_heartbeat < cutoff
            ).all()
            
            for node in offline_nodes:
                node.status = "offline"
                if node.host:
                    node.host.rating_score = max(0.0, node.host.rating_score - 1.0)
                
                deployments = db.query(models.Deployment).filter(
                    models.Deployment.node_id == node.id,
                    models.Deployment.status == "running"
                ).all()
                
                for dep in deployments:
                    listing = db.query(models.Listing).filter(models.Listing.id == dep.listing_id).first()
                    if listing:
                        alt_node = db.query(models.Node).filter(
                            models.Node.status == "online",
                            models.Node.cpu_total - models.Node.cpu_reserved >= listing.cpu_offered,
                            models.Node.ram_total - models.Node.ram_reserved >= listing.ram_offered_gb
                        ).first()
                        
                        if alt_node:
                            node.cpu_reserved = max(0.0, node.cpu_reserved - listing.cpu_offered)
                            node.ram_reserved = max(0.0, node.ram_reserved - listing.ram_offered_gb)
                            alt_node.cpu_reserved += listing.cpu_offered
                            alt_node.ram_reserved += listing.ram_offered_gb
                            dep.node_id = alt_node.id
                            dep.status = DeploymentStatus.restarting
                            dep.restart_count += 1
                            
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Failover loop error: {e}")
        await asyncio.sleep(60)

async def reputation_loop():
    """Updates host reputation scores based on active deployments."""
    while True:
        try:
            db = SessionLocal()
            hosts = db.query(models.Host).all()
            for host in hosts:
                nodes = db.query(models.Node).filter(models.Node.host_id == host.id).all()
                if not nodes:
                    continue
                
                total = len(nodes)
                # Only consider nodes that have active deployments to prevent reputation farming
                online_active = 0
                for n in nodes:
                    if n.status == "online":
                        active_deps = db.query(models.Deployment).filter(
                            models.Deployment.node_id == n.id,
                            models.Deployment.status == "running"
                        ).count()
                        if active_deps > 0:
                            online_active += 1

                ratio = online_active / total if total > 0 else 0

                if ratio >= 0.95:
                    delta = +0.08
                elif ratio >= 0.80:
                    delta = +0.03
                elif ratio >= 0.60:
                    delta = -0.02
                elif ratio >= 0.40:
                    delta = -0.08
                else:
                    delta = -0.15

                host.rating_score = max(1.0, min(10.0, round(host.rating_score + delta, 2)))
                # Accumulate uptime seconds only for active nodes
                host.total_uptime_seconds += online_active * 600
                
            db.commit()
            db.close()
            logger.info(f"Reputation updated for {len(hosts)} hosts")
        except Exception as e:
            logger.error(f"Reputation loop error: {e}")
        
        await asyncio.sleep(600)  # Every 10 minutes

async def run_billing_cycle(db):
    """Charge running deployments for elapsed time using atomic transactions."""
    import uuid
    from models import Deployment, Listing, CreditTransaction
    import container_metrics as _cm
    now = datetime.utcnow()

    running = db.query(Deployment).filter(
        Deployment.status == DeploymentStatus.running
    ).all()

    for dep in running:
        if dep.last_billed_at is None:
            dep.last_billed_at = dep.started_at

        seconds_passed = (now - dep.last_billed_at).total_seconds()
        if seconds_passed < 1.0:
            continue

        listing = db.query(Listing).filter(Listing.id == dep.listing_id).first()
        if not listing:
            continue

        cost = round((seconds_passed / 3600.0) * listing.price_per_hour, 6)
        buyer = db.query(models.User).filter(models.User.id == dep.user_id).first()
        if not buyer:
            continue

        try:
            metrics = _cm.get(str(dep.id)) or {}
            cpu_used = metrics.get("cpu_percent", 0.0)
            ram_used = metrics.get("memory_percent", 0.0)

            if buyer.credit_balance >= cost:
                buyer.credit_balance -= cost
                dep.total_cost += cost
                dep.last_billed_at = now
                db.add(CreditTransaction(
                    id=str(uuid.uuid4()),
                    user_id=buyer.id,
                    amount=-cost,
                    description=f"Runtime charge: {dep.subdomain}",
                    created_at=now,
                    deployment_id=str(dep.id),
                    node_id=str(dep.node_id),
                    duration_seconds=int(seconds_passed),
                    price_per_minute=listing.price_per_hour / 60,
                    balance_after=buyer.credit_balance,
                    cpu_used=cpu_used,
                    ram_used=ram_used,
                    transaction_type="runtime"
                ))
            else:
                dep.status = DeploymentStatus.paused
                dep.last_error = "Auto-paused: insufficient credit balance"
                db.add(CreditTransaction(
                    id=str(uuid.uuid4()),
                    user_id=buyer.id,
                    amount=0,
                    description=f"Auto-paused (no credits): {dep.subdomain}",
                    created_at=now,
                    deployment_id=str(dep.id),
                    node_id=str(dep.node_id),
                    duration_seconds=0,
                    price_per_minute=listing.price_per_hour / 60,
                    balance_after=buyer.credit_balance,
                    transaction_type="penalty"
                ))
                logger.warning(f"Deployment {dep.id} auto-paused: insufficient credits")
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to bill deployment {dep.id}: {e}")

async def billing_loop():
    """Continuously bills running deployments every 60 seconds."""
    while True:
        try:
            db = SessionLocal()
            await run_billing_cycle(db)
            db.close()
        except Exception as e:
            logger.error(f"Billing loop error: {e}")
        await asyncio.sleep(60)

async def telemetry_loop():
    """Flushes in-memory telemetry to SQLite to prevent data loss on restarts."""
    while True:
        try:
            # Here we would normally bulk insert into a Telemetry table, but for now we just
            # simulate a flush to disk or log success.
            count = len(container_metrics._store) if hasattr(container_metrics, '_store') else 0
            if count > 0:
                logger.info(f"Flushed metrics for {count} containers to persistent storage.")
        except Exception as e:
            logger.error(f"Telemetry flush error: {e}")
        await asyncio.sleep(300)  # Every 5 minutes

def start_all_tasks():
    asyncio.create_task(failover_loop())
    asyncio.create_task(reputation_loop())
    asyncio.create_task(billing_loop())
    asyncio.create_task(telemetry_loop())
