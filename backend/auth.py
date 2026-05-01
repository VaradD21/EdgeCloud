import bcrypt
from jose import jwt
from datetime import datetime, timedelta
import os
import secrets

env_secret = os.getenv("JWT_SECRET")
# DEMO: Use a fixed secret so logins survive uvicorn reloads
SECRET_KEY = env_secret if env_secret else "edgecloud-demo-secret-key-123"

if os.getenv("ENV") == "prod" and not env_secret:
    raise RuntimeError("JWT_SECRET must be set in production")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

def verify_password(plain_password, hashed_password):
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
