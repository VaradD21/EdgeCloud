from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.models.credit_transaction import TransactionType

class CreditBalance(BaseModel):
    balance_cents: int
    formatted: str

class CreditTopupRequest(BaseModel):
    amount_cents: int

class CreditTransactionResponse(BaseModel):
    id: UUID
    amount_cents: int
    type: TransactionType
    description: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
