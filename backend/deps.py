from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        print(f"DEBUG: token payload: sub={user_id}, role={role}")
        if user_id is None:
            print("DEBUG: user_id is None")
            raise credentials_exception
    except JWTError as e:
        print(f"DEBUG: JWT Error: {e}")
        raise credentials_exception
        
    print(f"DEBUG: querying for user.id == {user_id}")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        print(f"DEBUG: User NOT found in DB for ID: {user_id}")
        raise credentials_exception
    print(f"DEBUG: Found user {user.email}")
    return user

def get_current_user_from_token(token: str, db: Session):
    return get_current_user(token=token, db=db)

def get_current_host(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "host":
        raise HTTPException(status_code=403, detail="Not authorized, host role required")
    return current_user
