from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    role: UserRole
    credit_balance_cents: int
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenResponse(Token):
    user: UserResponse

class RefreshRequest(BaseModel):
    refresh_token: str
