from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.listing import Listing, ListingStatus
from app.models.node import Node, NodeStatus
from app.schemas.listing import ListingCreate, ListingUpdate
import uuid

async def create_listing(db: AsyncSession, user_id: uuid.UUID, listing_in: ListingCreate) -> Listing:
    result = await db.execute(select(Node).where(Node.id == listing_in.node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    if node.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to create listing for this node")
        
    available_cpu = node.cpu_cores_total - node.cpu_cores_reserved
    available_ram = node.ram_gb_total - node.ram_gb_reserved
    
    if listing_in.cpu_cores > available_cpu or listing_in.ram_gb > available_ram:
        raise HTTPException(status_code=400, detail="Requested resources exceed available node capacity")
        
    db_listing = Listing(
        node_id=listing_in.node_id,
        user_id=user_id,
        cpu_cores=listing_in.cpu_cores,
        ram_gb=listing_in.ram_gb,
        disk_gb=listing_in.disk_gb,
        price_per_hour_cents=listing_in.price_per_hour_cents
    )
    db.add(db_listing)
    await db.commit()
    await db.refresh(db_listing)
    return db_listing

async def get_listings(db: AsyncSession, min_cpu: float=0, min_ram: float=0, max_price: int=None, sort_by: str="price"):
    from sqlalchemy.orm import selectinload
    stmt = select(Listing).options(selectinload(Listing.node)).join(Node).where(
        Listing.status == ListingStatus.active,
        Node.status == NodeStatus.online,
        Listing.cpu_cores >= min_cpu,
        Listing.ram_gb >= min_ram
    )
    if max_price is not None:
        stmt = stmt.where(Listing.price_per_hour_cents <= max_price)
        
    if sort_by == "rating":
        stmt = stmt.order_by(Node.uptime_score.desc())
    elif sort_by == "ram":
        stmt = stmt.order_by(Listing.ram_gb.desc())
    else:
        stmt = stmt.order_by(Listing.price_per_hour_cents.asc())
        
    result = await db.execute(stmt)
    return result.scalars().all()
    
async def get_listing(db: AsyncSession, listing_id: uuid.UUID) -> Listing:
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing

async def update_listing(db: AsyncSession, user_id: uuid.UUID, listing_id: uuid.UUID, update_data: ListingUpdate) -> Listing:
    listing = await get_listing(db, listing_id)
    if listing.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if update_data.price_per_hour_cents is not None:
        listing.price_per_hour_cents = update_data.price_per_hour_cents
    if update_data.status is not None:
        listing.status = update_data.status
        
    await db.commit()
    await db.refresh(listing)
    return listing

async def delete_listing(db: AsyncSession, user_id: uuid.UUID, listing_id: uuid.UUID):
    listing = await get_listing(db, listing_id)
    if listing.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    listing.status = ListingStatus.deleted
    await db.commit()
