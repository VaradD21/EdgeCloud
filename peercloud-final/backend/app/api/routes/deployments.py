from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.deployment import DeploymentCreate, DeploymentResponse
from app.services import deployment_service
import uuid
from typing import List

router = APIRouter(prefix="/deployments", tags=["deployments"])

@router.post("", response_model=DeploymentResponse)
async def create_deployment(deployment_in: DeploymentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.buyer, UserRole.both]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await deployment_service.create_deployment(db, current_user, deployment_in)

@router.get("", response_model=List[DeploymentResponse])
async def get_deployments(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await deployment_service.get_deployments(db, current_user.id)

@router.get("/{id}", response_model=DeploymentResponse)
async def get_deployment(id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await deployment_service.get_deployment(db, id, current_user.id)

@router.delete("/{id}")
async def stop_deployment(id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await deployment_service.stop_deployment(db, id, current_user.id)
    return {"status": "stopping"}

@router.get("/{id}/logs")
async def get_logs(id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await deployment_service.get_deployment(db, id, current_user.id)
    logs = await deployment_service.get_logs(id)
    return logs

@router.get("/{id}/stats")
async def get_stats(id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await deployment_service.get_deployment(db, id, current_user.id)
    stats = await deployment_service.get_stats(id)
    return stats

@router.post("/upload")
async def upload_package(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    return {"status": "uploaded", "url": "https://storage.peercloud.app/packages/mock.peerpkg"}
