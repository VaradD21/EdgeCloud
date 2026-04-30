from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import schemas
import auth
from deps import get_current_user

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Edgecloud API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import asyncio
from datetime import timedelta
from database import SessionLocal

async def node_monitor_task():
    while True:
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            cutoff = now - timedelta(seconds=90)
            
            # 1. Failover check
            offline_nodes = db.query(models.Node).filter(
                models.Node.status == "online",
                models.Node.last_heartbeat < cutoff
            ).all()
            
            for node in offline_nodes:
                node.status = "offline"
                if node.host:
                    node.host.rating_score = max(0.0, node.host.rating_score - 1.0)
                
                # Failover running deployments
                deployments = db.query(models.Deployment).filter(
                    models.Deployment.node_id == node.id,
                    models.Deployment.status == "running"
                ).all()
                
                for dep in deployments:
                    listing = db.query(models.Listing).filter(models.Listing.id == dep.listing_id).first()
                    if listing:
                        alt_node = db.query(models.Node).filter(
                            models.Node.status == "online",
                            models.Node.cpu_total - models.Node.cpu_reserved >= listing.cpu,
                            models.Node.ram_total - models.Node.ram_reserved >= listing.ram
                        ).first()
                        
                        if alt_node:
                            node.cpu_reserved = max(0.0, node.cpu_reserved - listing.cpu)
                            node.ram_reserved = max(0.0, node.ram_reserved - listing.ram)
                            alt_node.cpu_reserved += listing.cpu
                            alt_node.ram_reserved += listing.ram
                            dep.node_id = alt_node.id
                            
            # 2. Uptime rating update
            online_nodes = db.query(models.Node).filter(models.Node.status == "online").all()
            for node in online_nodes:
                if node.host:
                    node.host.rating_score += 0.1
                    node.host.total_uptime += 1
                    
            db.commit()
            db.close()
        except Exception as e:
            print(f"Monitor error: {e}")
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(node_monitor_task())

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/auth/register", response_model=schemas.UserOut)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if user_in.role not in ["buyer", "host"]:
        raise HTTPException(status_code=400, detail="Role must be buyer or host")
        
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = auth.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        password=hashed_password,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not auth.verify_password(user_in.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = auth.create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

from datetime import datetime

@app.post("/hosts/register", response_model=schemas.HostOut)
def register_host(host_in: schemas.HostCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "host":
        raise HTTPException(status_code=403, detail="Only hosts can register a host profile")
        
    existing_host = db.query(models.Host).filter(models.Host.user_id == current_user.id).first()
    if existing_host:
        raise HTTPException(status_code=400, detail="User already has a host profile")
        
    new_host = models.Host(
        user_id=current_user.id,
        display_name=host_in.display_name
    )
    db.add(new_host)
    db.commit()
    db.refresh(new_host)
    return new_host

@app.get("/hosts/me", response_model=schemas.HostOut)
def get_my_host(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(models.Host).filter(models.Host.user_id == current_user.id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Host profile not found")
    return host

@app.post("/nodes/register", response_model=schemas.NodeOut)
def register_node(node_in: schemas.NodeCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(models.Host).filter(models.Host.user_id == current_user.id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Host profile not found")
        
    new_node = models.Node(
        host_id=host.id,
        cpu_total=node_in.cpu_total,
        ram_total=node_in.ram_total
    )
    db.add(new_node)
    db.commit()
    db.refresh(new_node)
    return new_node

@app.post("/nodes/heartbeat")
def node_heartbeat(heartbeat: schemas.NodeHeartbeat, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(models.Host).filter(models.Host.user_id == current_user.id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Host profile not found")
        
    node = db.query(models.Node).filter(models.Node.id == heartbeat.node_id, models.Node.host_id == host.id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found or not owned by host")
        
    node.cpu_reserved = heartbeat.cpu_usage
    node.ram_reserved = heartbeat.ram_usage
    node.last_heartbeat = datetime.utcnow()
    node.status = "online"
    
    db.commit()
    return {"status": "ok"}

from typing import Optional, List

@app.post("/listings", response_model=schemas.ListingOut)
def create_listing(listing_in: schemas.ListingCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(models.Host).filter(models.Host.user_id == current_user.id).first()
    if not host:
        raise HTTPException(status_code=403, detail="Only hosts can create listings")
        
    node = db.query(models.Node).filter(models.Node.id == listing_in.node_id, models.Node.host_id == host.id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found or not owned by host")
        
    new_listing = models.Listing(
        host_id=host.id,
        node_id=node.id,
        cpu=listing_in.cpu,
        ram=listing_in.ram,
        price_per_hour=listing_in.price_per_hour
    )
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    
    result = schemas.ListingOut.model_validate(new_listing)
    result.host_display_name = host.display_name
    result.host_rating = host.rating_score
    return result

@app.get("/listings", response_model=List[schemas.ListingOut])
def get_listings(min_cpu: Optional[float] = None, min_ram: Optional[float] = None, max_price: Optional[float] = None, db: Session = Depends(get_db)):
    query = db.query(models.Listing, models.Host, models.Node).join(
        models.Host, models.Listing.host_id == models.Host.id
    ).join(
        models.Node, models.Listing.node_id == models.Node.id
    ).filter(models.Listing.status == "active")
    
    if min_cpu is not None:
        query = query.filter(models.Listing.cpu >= min_cpu)
    if min_ram is not None:
        query = query.filter(models.Listing.ram >= min_ram)
    if max_price is not None:
        query = query.filter(models.Listing.price_per_hour <= max_price)
        
    results = []
    for listing, host, node in query.all():
        out = schemas.ListingOut.model_validate(listing)
        out.host_display_name = host.display_name
        out.host_rating = round(host.rating_score, 1)
        out.node_status = node.status
        results.append(out)
        
    return results

@app.get("/listings/{id}", response_model=schemas.ListingOut)
def get_listing(id: str, db: Session = Depends(get_db)):
    result = db.query(models.Listing, models.Host, models.Node).join(
        models.Host, models.Listing.host_id == models.Host.id
    ).join(
        models.Node, models.Listing.node_id == models.Node.id
    ).filter(models.Listing.id == id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Listing not found")
        
    listing, host, node = result
    out = schemas.ListingOut.model_validate(listing)
    out.host_display_name = host.display_name
    out.host_rating = round(host.rating_score, 1)
    out.node_status = node.status
    return out

import uuid

@app.post("/deployments", response_model=schemas.DeploymentOut)
def create_deployment(deploy_in: schemas.DeploymentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == deploy_in.listing_id, models.Listing.status == "active").first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or inactive")
        
    node = db.query(models.Node).filter(models.Node.id == listing.node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    # Simulate marking resources used
    node.cpu_reserved += listing.cpu
    node.ram_reserved += listing.ram
    
    subdomain = f"{deploy_in.name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}.edgecloud.local"
    
    new_deployment = models.Deployment(
        user_id=current_user.id,
        listing_id=listing.id,
        node_id=node.id,
        name=deploy_in.name,
        docker_image=deploy_in.docker_image,
        subdomain=subdomain,
        status="running"
    )
    
    db.add(new_deployment)
    db.commit()
    db.refresh(new_deployment)
    return new_deployment

@app.get("/deployments", response_model=List[schemas.DeploymentOut])
def get_deployments(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    deployments = db.query(models.Deployment).filter(models.Deployment.user_id == current_user.id).all()
    return deployments

@app.get("/deployments/{id}", response_model=schemas.DeploymentOut)
def get_deployment(id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    deployment = db.query(models.Deployment).filter(models.Deployment.id == id, models.Deployment.user_id == current_user.id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return deployment

@app.delete("/deployments/{id}")
def delete_deployment(id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    deployment = db.query(models.Deployment).filter(models.Deployment.id == id, models.Deployment.user_id == current_user.id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
        
    if deployment.status == "running":
        listing = db.query(models.Listing).filter(models.Listing.id == deployment.listing_id).first()
        node = db.query(models.Node).filter(models.Node.id == deployment.node_id).first()
        
        if node and listing:
            node.cpu_reserved = max(0.0, node.cpu_reserved - listing.cpu)
            node.ram_reserved = max(0.0, node.ram_reserved - listing.ram)
            
    deployment.status = "stopped"
    db.commit()
    return {"status": "ok"}

@app.get("/nodes/{id}/stats", response_model=schemas.NodeOut)
def get_node_stats(id: str, db: Session = Depends(get_db)):
    node = db.query(models.Node).filter(models.Node.id == id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@app.get("/hosts/{id}", response_model=schemas.HostOut)
def get_host(id: str, db: Session = Depends(get_db)):
    host = db.query(models.Host).filter(models.Host.id == id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    return host
