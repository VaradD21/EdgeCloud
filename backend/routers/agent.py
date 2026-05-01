"""
Agent communication router.

Auth: Agents identify via their node_secret (Bearer token).
The node_secret is the JWT issued at node registration time.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import List, Optional
import logging
import os

from database import get_db
import models
from schemas_agent import AgentDeploymentOut, AgentRejectionReport, AgentLogPush, AgentMetricsPush, AgentStartedReport
import log_store
import container_metrics
from auth import SECRET_KEY, ALGORITHM

router = APIRouter()
log = logging.getLogger("edgecloud")




def get_node_from_secret(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> models.Node:
    """
    Validates the Bearer node_secret and returns the authenticated Node.
    The node_secret is the JWT issued during POST /nodes/register.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired node secret")

    node = db.query(models.Node).filter(models.Node.node_secret == token).first()
    if not node:
        raise HTTPException(status_code=403, detail="Node not recognised")

    return node


@router.get("/deployments", response_model=List[AgentDeploymentOut], tags=["agent"])
def get_agent_deployments(
    node: models.Node = Depends(get_node_from_secret),
    db: Session = Depends(get_db),
):
    """
    Returns the list of deployments assigned to the calling node.
    Auth: Bearer <node_secret>
    """
    deployments = (
        db.query(models.Deployment, models.Listing)
        .join(models.Listing, models.Deployment.listing_id == models.Listing.id)
        .filter(models.Deployment.node_id == node.id)
        .filter(models.Deployment.status.notin_(["deleted"]))
        .all()
    )

    result: List[AgentDeploymentOut] = []
    for dep, listing in deployments:
        result.append(AgentDeploymentOut(
            deployment_id=str(dep.id),
            docker_image=dep.docker_image,
            cpu_limit=listing.cpu_offered,
            ram_limit=listing.ram_offered_gb,
            container_port=dep.container_port,
            env_vars=dep.env_vars,
            status=dep.status,
            restart_policy=dep.restart_policy or "on-failure",
        ))

    return result


@router.post("/report-rejection", tags=["agent"])
def report_rejection(
    body: AgentRejectionReport,
    node: models.Node = Depends(get_node_from_secret),
    db: Session = Depends(get_db),
):
    """
    Called by the agent when it cannot start a deployment due to
    insufficient local CPU or RAM. Marks the deployment as 'failed'
    and persists the agent's rejection reason in last_error.

    Auth: Bearer <node_secret>
    """
    deployment = (
        db.query(models.Deployment)
        .filter(
            models.Deployment.id == body.deployment_id,
            models.Deployment.node_id == node.id,
        )
        .first()
    )
    if not deployment:
        raise HTTPException(
            status_code=404,
            detail="Deployment not found or does not belong to this node",
        )

    deployment.status = "failed"
    deployment.last_error = (
        f"{body.reason} "
        f"(available: {body.available_cpu:.1f} CPU, {body.available_ram_gb:.2f}GB RAM)"
    )
    db.commit()

    log.warning(
        f"Deployment {body.deployment_id} rejected by node {node.id}: {body.reason} "
        f"| available CPU={body.available_cpu} RAM={body.available_ram_gb}GB"
    )
    return {"status": "recorded"}


@router.post("/report-started", tags=["agent"])
def report_started(
    body: AgentStartedReport,
    node: models.Node = Depends(get_node_from_secret),
    db: Session = Depends(get_db),
):
    """
    Called by the agent when it successfully starts a deployment that was in 'restarting' state
    due to failover. Transitions the deployment back to 'running'.
    
    Auth: Bearer <node_secret>
    """
    deployment = (
        db.query(models.Deployment)
        .filter(
            models.Deployment.id == body.deployment_id,
            models.Deployment.node_id == node.id,
        )
        .first()
    )
    if not deployment:
        raise HTTPException(
            status_code=404,
            detail="Deployment not found or does not belong to this node",
        )

    if deployment.status == "restarting":
        from deployment_status import DeploymentStatus
        deployment.status = DeploymentStatus.running
        db.commit()
        log.info(f"Deployment {body.deployment_id} successfully restarted on node {node.id}")
        return {"status": "running"}
        
    return {"status": "ignored"}



@router.post("/push-logs", tags=["agent"])
def push_logs(
    body: AgentLogPush,
    node: models.Node = Depends(get_node_from_secret),
    db: Session = Depends(get_db),
):
    """
    Called by the agent to push the latest container log lines to the backend.
    Lines are stored in an in-memory ring buffer (max 100 per deployment).

    Auth: Bearer <node_secret>
    """
    # Verify the deployment belongs to this node
    deployment = (
        db.query(models.Deployment)
        .filter(
            models.Deployment.id == body.deployment_id,
            models.Deployment.node_id == node.id,
        )
        .first()
    )
    if not deployment:
        raise HTTPException(
            status_code=404,
            detail="Deployment not found or does not belong to this node",
        )

    log_store.push(body.deployment_id, body.lines)
    return {"stored": len(body.lines)}


@router.post("/push-metrics", tags=["agent"])
def push_metrics(
    body: AgentMetricsPush,
    node: models.Node = Depends(get_node_from_secret),
    db: Session = Depends(get_db),
):
    """
    Called by the agent to push per-container CPU/memory/uptime snapshots.
    Stored in an in-memory dict (one entry per deployment, last-write-wins).
    The WebSocket broadcaster reads from this store to deliver real-time metrics.

    Auth: Bearer <node_secret>
    """
    node_deployment_ids = {
        str(d.id)
        for d in db.query(models.Deployment.id).filter(
            models.Deployment.node_id == node.id
        ).all()
    }

    accepted = 0
    for m in body.metrics:
        if m.deployment_id not in node_deployment_ids:
            continue  # reject metrics for deployments not on this node
        container_metrics.push(m.deployment_id, {
            "cpu_percent":      m.cpu_percent,
            "memory_mb":        m.memory_mb,
            "memory_limit_mb":  m.memory_limit_mb,
            "uptime_seconds":   m.uptime_seconds,
        })
        accepted += 1

    return {"accepted": accepted}
