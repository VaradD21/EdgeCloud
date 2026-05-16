from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.listing import ListingCreate, ListingResponse, ListingUpdate
from app.services import listing_service
import uuid
from typing import List, Optional

router = APIRouter(prefix="/listings", tags=["listings"])

@router.get("", response_model=List[ListingResponse])
async def get_listings(
    min_cpu: float = 0,
    min_ram: float = 0,
    max_price_cents: Optional[int] = None,
    sort_by: str = Query("price", pattern="^(price|rating|ram)$"),
    db: AsyncSession = Depends(get_db)
):
    return await listing_service.get_listings(db, min_cpu, min_ram, max_price_cents, sort_by)

@router.post("", response_model=ListingResponse)
async def create_listing(listing_in: ListingCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.host, UserRole.both]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await listing_service.create_listing(db, current_user.id, listing_in)

@router.get("/{id}", response_model=ListingResponse)
async def get_listing(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.models.listing import Listing
    stmt = select(Listing).options(selectinload(Listing.node)).where(Listing.id == id)
    result = await db.execute(stmt)
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Not found")
    return listing

@router.patch("/{id}", response_model=ListingResponse)
async def update_listing(id: uuid.UUID, listing_update: ListingUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await listing_service.update_listing(db, current_user.id, id, listing_update)

@router.delete("/{id}")
async def delete_listing(id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await listing_service.delete_listing(db, current_user.id, id)
    return {"status": "deleted"}
