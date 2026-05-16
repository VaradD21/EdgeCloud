from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, declared_attr
from datetime import datetime, timezone
import sqlalchemy as sa
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.ENVIRONMENT == "development")
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class CustomBase:
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s"

Base = declarative_base(cls=CustomBase)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
