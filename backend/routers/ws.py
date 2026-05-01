from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from database import SessionLocal
from deps import get_current_user_from_token
from models import Deployment, Node, User, Host
import asyncio, json
import container_metrics
from datetime import datetime

router = APIRouter()

# In-memory connection store
connections: dict[str, WebSocket] = {}  # user_id → websocket

@router.websocket("/buyer")
async def buyer_ws(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    db = SessionLocal()
    try:
        user = get_current_user_from_token(token, db)
        connections[user.id] = websocket
        while True:
            deps = db.query(Deployment).filter(
                Deployment.user_id == user.id,
                Deployment.status.in_(["running", "migrating", "paused"])
            ).all()
            db.refresh(user)
            now = datetime.utcnow()

            deployment_list = []
            for d in deps:
                metrics = container_metrics.get(d.id) or {}
                deployment_list.append({
                    "id":               d.id,
                    "subdomain":        d.subdomain,
                    "status":           d.status,
                    "docker_image":     d.docker_image,
                    "last_error":       d.last_error,
                    "runtime_minutes":  round(
                        (now - d.started_at).total_seconds() / 60, 1
                    ) if d.started_at else 0,
                    # Container metrics — None if agent hasn't pushed yet
                    "cpu_percent":      metrics.get("cpu_percent"),
                    "memory_mb":        metrics.get("memory_mb"),
                    "memory_limit_mb":  metrics.get("memory_limit_mb"),
                    "uptime_seconds":   metrics.get("uptime_seconds"),
                    "metrics_at":       metrics.get("updated_at"),
                })

            payload = {
                "type":           "buyer_update",
                "credit_balance": round(user.credit_balance, 4),
                "deployments":    deployment_list,
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(8)
    except (WebSocketDisconnect, Exception):
        connections.pop(user.id if 'user' in dir() else '', None)
    finally:
        db.close()

@router.websocket("/host")
async def host_ws(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    db = SessionLocal()
    try:
        user = get_current_user_from_token(token, db)
        connections[user.id] = websocket
        host = db.query(Host).filter(Host.user_id == user.id).first()
        while True:
            if host:
                nodes = db.query(Node).filter(Node.host_id == host.id).all()
                now = datetime.utcnow()
                db.refresh(host)
                payload = {
                    "type": "host_update",
                    "rating_score": round(host.rating_score, 2),
                    "total_uptime_hours": round(host.total_uptime / 3600, 1),
                    "nodes": [
                        {
                            "id": n.id, "name": n.name, "status": n.status,
                            "cpu_used_percent": round((n.cpu_reserved / n.cpu_total * 100) if n.cpu_total else 0, 1),
                            "ram_used_percent": round((n.ram_reserved / n.ram_total * 100) if n.ram_total else 0, 1),
                            "storage_used_percent": round((n.storage_reserved_gb / n.storage_total_gb * 100) if n.storage_total_gb else 0, 1),
                            "seconds_since_heartbeat": int((now - n.last_heartbeat).total_seconds()) if n.last_heartbeat else 9999,
                            "active_deployments": db.query(Deployment).filter(
                                Deployment.node_id == n.id, Deployment.status == "running").count()
                        } for n in nodes
                    ]
                }
                await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(10)
    except (WebSocketDisconnect, Exception):
        connections.pop(user.id if 'user' in dir() else '', None)
    finally:
        db.close()

async def notify_user(user_id: str, message: dict):
    ws = connections.get(user_id)
    if ws:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            connections.pop(user_id, None)
