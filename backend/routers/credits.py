from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from deps import get_current_user
from models import User, CreditTransaction
import uuid
from datetime import datetime
from typing import Optional, List
import schemas

router = APIRouter()

@router.get("/balance")
def get_balance(current_user: User = Depends(get_current_user)):
    return {"balance": round(current_user.credit_balance, 4)}

from pydantic import BaseModel

class AddCreditsRequest(BaseModel):
    amount: float
    payment_method_id: str

@router.post("/add")
def add_credits(req: AddCreditsRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if req.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    if not req.payment_method_id.startswith("pm_"):
        raise HTTPException(400, "Invalid payment method")
        
    # Simulate payment gateway charge here
    # ...
    
    current_user.credit_balance += req.amount
    tx = CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        amount=req.amount,
        description=f"Manual top-up: +{req.amount} credits",
        created_at=datetime.utcnow(),
        balance_after=current_user.credit_balance,
        transaction_type="topup"
    )
    db.add(tx)
    db.commit()
    return {"new_balance": round(current_user.credit_balance, 4), "transaction_id": tx.id}

@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txs = db.query(CreditTransaction).filter(
        CreditTransaction.user_id == current_user.id
    ).order_by(CreditTransaction.created_at.desc()).limit(50).all()
    return txs

@router.get("/history", response_model=List[schemas.CreditTransactionOut])
def get_history(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    deployment_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CreditTransaction).filter(CreditTransaction.user_id == current_user.id)
    
    if start_date:
        query = query.filter(CreditTransaction.created_at >= start_date)
    if end_date:
        query = query.filter(CreditTransaction.created_at <= end_date)
    if deployment_id:
        query = query.filter(CreditTransaction.deployment_id == deployment_id)
        
    return query.order_by(CreditTransaction.created_at.desc()).offset(skip).limit(limit).all()
