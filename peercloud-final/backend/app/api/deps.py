from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_token, verify_node_secret
from app.models.user import User
from app.models.node import Node
import uuid

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

async def get_node_by_secret(
    x_node_id: str = Header(...),
    x_node_secret: str = Header(...),
    db: AsyncSession = Depends(get_db)
) -> Node:
    try:
        node_uuid = uuid.UUID(x_node_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid node ID")
        
    result = await db.execute(select(Node).where(Node.id == node_uuid))
    node = result.scalar_one_or_none()
    
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
        
    if not verify_node_secret(x_node_secret, node.node_secret):
        raise HTTPException(status_code=401, detail="Invalid node secret")
        
    return node
