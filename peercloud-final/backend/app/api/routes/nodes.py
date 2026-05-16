from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user, get_node_by_secret
from app.models.user import User, UserRole
from app.models.node import Node
from app.schemas.node import NodeCreate, NodeRegisterResponse, HeartbeatRequest, PushLogsRequest, PushStatsRequest
from app.services import node_service

router = APIRouter(prefix="/nodes", tags=["nodes"])

@router.post("/register", response_model=NodeRegisterResponse)
async def register(node_in: NodeCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.host, UserRole.both]:
        raise HTTPException(status_code=403, detail="Not authorized to register nodes")
    node_id, secret = await node_service.register_node(db, current_user.id, node_in)
    return {"node_id": node_id, "node_secret": secret}

@router.post("/heartbeat")
async def heartbeat(req: HeartbeatRequest, node: Node = Depends(get_node_by_secret), db: AsyncSession = Depends(get_db)):
    if node.id != req.node_id:
        raise HTTPException(status_code=400, detail="Node ID mismatch")
    assigned_workloads = await node_service.process_heartbeat(db, node, req)
    return {"assigned_workloads": assigned_workloads}

@router.get("/assigned-workloads")
async def get_assigned_workloads(node: Node = Depends(get_node_by_secret), db: AsyncSession = Depends(get_db)):
    req = HeartbeatRequest(node_id=node.id, cpu_percent=0.0, ram_gb_used=0.0)
    workloads = await node_service.process_heartbeat(db, node, req)
    return workloads

@router.post("/push-logs")
async def push_logs(req: PushLogsRequest, node: Node = Depends(get_node_by_secret), db: AsyncSession = Depends(get_db)):
    await node_service.push_logs(db, req)
    return {"status": "ok"}

@router.post("/push-stats")
async def push_stats(req: PushStatsRequest, node: Node = Depends(get_node_by_secret)):
    await node_service.push_stats(req)
    return {"status": "ok"}
