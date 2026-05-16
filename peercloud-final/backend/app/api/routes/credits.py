from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.credit import CreditBalance, CreditTopupRequest, CreditTransactionResponse
from app.services import billing_service
from typing import List

router = APIRouter(prefix="/credits", tags=["credits"])

@router.get("/balance", response_model=CreditBalance)
async def get_balance(current_user: User = Depends(get_current_user)):
    return await billing_service.get_balance(current_user)

@router.get("/history", response_model=List[CreditTransactionResponse])
async def get_history(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await billing_service.get_history(db, current_user.id)

@router.post("/topup", response_model=dict)
async def topup(topup_in: CreditTopupRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.buyer, UserRole.both]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await billing_service.topup_credits(db, current_user, topup_in)
