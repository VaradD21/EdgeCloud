from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from deps import get_current_user
from models import User, Deployment, CreditTransaction
import auth
import schemas
from typing import List
from deployment_status import DeploymentStatus
from utils.resources import release_resources
import uuid
import logging

logger = logging.getLogger("edgecloud")

router = APIRouter()

@router.put("/update-email", response_model=schemas.UserOut)
def update_email(
    update_data: schemas.UserUpdateEmail,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not auth.verify_password(update_data.password, current_user.password):
        raise HTTPException(status_code=400, detail="Incorrect password")
        
    existing = db.query(User).filter(User.email == update_data.new_email).first()
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=400, detail="Email already in use")
        
    current_user.email = update_data.new_email
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/change-password")
def change_password(
    update_data: schemas.UserUpdatePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not auth.verify_password(update_data.old_password, current_user.password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    current_user.password = auth.get_password_hash(update_data.new_password)
    db.commit()
    return {"status": "Password updated successfully"}

@router.delete("/delete-account")
def delete_account(
    password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not auth.verify_password(password, current_user.password):
        raise HTTPException(status_code=400, detail="Incorrect password")
        
    # Soft delete
    current_user.active = False
    
    # Stop all deployments and release resources
    deployments = db.query(Deployment).filter(
        Deployment.user_id == current_user.id,
        Deployment.status.in_([DeploymentStatus.running, DeploymentStatus.restarting])
    ).all()
    
    for dep in deployments:
        dep.status = DeploymentStatus.stopped
        dep.last_error = "Account deleted"
        
        # Release resources
        from models import Listing
        listing = db.query(Listing).filter(Listing.id == dep.listing_id).first()
        if listing:
            release_resources(db, dep.node_id, listing.cpu_offered, listing.ram_offered_gb, listing.storage_offered_gb)
    
    db.commit()
    logger.info(f"User {current_user.id} soft deleted and deployments stopped.")
    return {"status": "Account deleted successfully"}

@router.get("/sessions", response_model=List[schemas.UserSessionOut])
def get_sessions(current_user: User = Depends(get_current_user)):
    # Since we use stateless JWTs, we return a mock representing the current session
    # A true session tracking system would query a sessions table
    return [{
        "session_id": str(uuid.uuid4()),
        "role": current_user.role,
        "email": current_user.email,
        "active_since": current_user.created_at
    }]
