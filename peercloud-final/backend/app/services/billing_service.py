from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException
from app.models.credit_transaction import CreditTransaction, TransactionType
from app.models.user import User
from app.schemas.credit import CreditTopupRequest
import uuid

async def get_balance(user: User) -> dict:
    return {
        "balance_cents": user.credit_balance_cents,
        "formatted": f"{user.credit_balance_cents / 100:.2f} credits"
    }

async def get_history(db: AsyncSession, user_id: uuid.UUID):
    stmt = select(CreditTransaction).where(CreditTransaction.user_id == user_id).order_by(CreditTransaction.created_at.desc()).limit(50)
    result = await db.execute(stmt)
    return result.scalars().all()

async def topup_credits(db: AsyncSession, user: User, topup_in: CreditTopupRequest) -> dict:
    if topup_in.amount_cents <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
        
    user.credit_balance_cents += topup_in.amount_cents
    
    transaction = CreditTransaction(
        user_id=user.id,
        amount_cents=topup_in.amount_cents,
        type=TransactionType.topup,
        description="Account topup"
    )
    db.add(transaction)
    await db.commit()
    
    return {"balance_cents": user.credit_balance_cents}
