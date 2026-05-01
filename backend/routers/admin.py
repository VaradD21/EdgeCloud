from fastapi import APIRouter, Header, HTTPException
from sqlalchemy.orm import Session
from fastapi import Depends
from database import get_db
from models import User, Host, Node, Listing, Deployment, CreditTransaction
import os
from datetime import datetime
from sqlalchemy import text

import secrets

router = APIRouter()

env_admin = os.getenv("ADMIN_KEY")
ADMIN_KEY = env_admin if env_admin else secrets.token_urlsafe(32)

if os.getenv("ENV") == "prod" and not env_admin:
    raise RuntimeError("ADMIN_KEY must be set in production")

def check_admin(x_admin_key: str = Header(...)):
    if not secrets.compare_digest(x_admin_key, ADMIN_KEY):
        raise HTTPException(403, "Invalid admin key")

@router.get("/health", dependencies=[Depends(check_admin)])
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except:
        db_ok = False
    return {
        "status": "ok",
        "db_connected": db_ok,
        "nodes_online": db.query(Node).filter(Node.status == "online").count(),
        "nodes_offline": db.query(Node).filter(Node.status == "offline").count(),
        "deployments_running": db.query(Deployment).filter(Deployment.status == "running").count(),
        "total_users": db.query(User).count(),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/stats", dependencies=[Depends(check_admin)])
def platform_stats(db: Session = Depends(get_db)):
    neg_txs = db.query(CreditTransaction).filter(CreditTransaction.amount < 0).all()
    total_revenue = abs(sum(t.amount for t in neg_txs))
    return {
        "total_hosts": db.query(Host).count(),
        "total_buyers": db.query(User).filter(User.role == "buyer").count(),
        "listings_available": db.query(Listing).filter(Listing.status == "available").count(),
        "listings_rented": db.query(Listing).filter(Listing.status == "rented").count(),
        "total_credits_in_system": round(sum(u.credit_balance for u in db.query(User).all()), 2),
        "total_revenue": round(total_revenue, 4),
    }

@router.get("/nodes", dependencies=[Depends(check_admin)])
def all_nodes(db: Session = Depends(get_db)):
    nodes = db.query(Node).all()
    from utils.resources import get_node_availability
    return [{"id": n.id, "name": n.name, "status": n.status,
             "last_heartbeat": n.last_heartbeat, **get_node_availability(n)} for n in nodes]

@router.get("/deployments/running", dependencies=[Depends(check_admin)])
def running_deployments(db: Session = Depends(get_db)):
    deps = db.query(Deployment).filter(Deployment.status == "running").all()
    now = datetime.utcnow()
    return [{"id": d.id, "subdomain": d.subdomain, "docker_image": d.docker_image,
             "started_at": d.started_at,
             "runtime_minutes": round((now - d.started_at).total_seconds() / 60, 1) if d.started_at else 0,
             "user_id": d.user_id, "node_id": d.node_id} for d in deps]

@router.post("/nodes/{node_id}/force-offline", dependencies=[Depends(check_admin)])
def force_offline(node_id: str, db: Session = Depends(get_db)):
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(404, "Node not found")
    from datetime import timedelta
    node.status = "offline"
    node.last_heartbeat = datetime.utcnow() - timedelta(seconds=120)
    db.commit()
    return {"message": f"Node {node_id} forced offline. Failover will trigger on next monitor cycle."}
