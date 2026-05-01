import logging
from datetime import datetime
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger("edgecloud")

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import schemas
import auth
import deps
import routers.agent
from deps import get_current_user

app = FastAPI(
    title="EdgeCloud API",
    description="Decentralized compute marketplace. Hosts rent idle PCs. Buyers deploy anything in Docker.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    msgs = [f"{e['loc'][-1]}: {e['msg']}" for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": msgs})

import os

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Welcome to EdgeCloud API",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0"
    }

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat()}

import routers.credits
import routers.ws
import routers.admin
import routers.agent
import routers.user
app.include_router(routers.credits.router, prefix="/credits", tags=["credits"])
app.include_router(routers.ws.router, prefix="/ws", tags=["ws"])
app.include_router(routers.admin.router, prefix="/admin", tags=["admin"])
app.include_router(routers.agent.router, prefix="/agent", tags=["agent"])
app.include_router(routers.user.router, prefix="/user", tags=["user"])

import asyncio
from deployment_status import DeploymentStatus, STARTABLE_FROM, STOPPABLE_FROM

@app.on_event("startup")
async def startup_event():
    logger.info("EdgeCloud API starting up")
    logger.info(f"Docs available at http://localhost:8000/docs")
    # DEMO: Tasks disabled
    # import tasks
    # tasks.start_all_tasks()

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
def register_host(host_in: schemas.HostCreate, current_user: models.User = Depends(deps.get_current_host), db: Session = Depends(get_db)):
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
        name=node_in.name,
        cpu_total=node_in.cpu_total,
        ram_total=node_in.ram_total,
        storage_total_gb=node_in.storage_total_gb,
        node_secret=auth.create_access_token(data={"sub": str(current_user.id), "role": "node"})
    )
    db.add(new_node)
    db.commit()
    db.refresh(new_node)
    
    # Auto-create a listing for the demo
    listing = models.Listing(
        node_id=new_node.id,
        host_id=host.id,
        cpu_offered=new_node.cpu_total,
        ram_offered_gb=new_node.ram_total,
        storage_offered_gb=new_node.storage_total_gb,
        price_per_hour=0.05,
        status="available"
    )
    db.add(listing)
    db.commit()
    
    return new_node

@app.post("/nodes/heartbeat")
def node_heartbeat(heartbeat: schemas.NodeHeartbeat, current_node: models.Node = Depends(routers.agent.get_node_from_secret), db: Session = Depends(get_db)):
    if heartbeat.node_id != current_node.id:
        raise HTTPException(status_code=403, detail="Token does not match node ID")
        
    current_node.cpu_usage_percent = heartbeat.cpu_usage_percent
    current_node.ram_usage_percent = heartbeat.ram_usage_percent
    current_node.storage_usage_percent = heartbeat.storage_usage_percent
    current_node.last_heartbeat = datetime.utcnow()
    current_node.status = "online"
    
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
        cpu_offered=listing_in.cpu_offered,
        ram_offered_gb=listing_in.ram_offered_gb,
        storage_offered_gb=listing_in.storage_offered_gb,
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
    ).filter(models.Listing.status.in_(["active", "available"]))
    
    if min_cpu is not None:
        query = query.filter(models.Listing.cpu_offered >= min_cpu)
    if min_ram is not None:
        query = query.filter(models.Listing.ram_offered_gb >= min_ram)
    if max_price is not None:
        query = query.filter(models.Listing.price_per_hour <= max_price)
        
    results = []
    for listing, host, node in query.all():
        out = schemas.ListingOut.model_validate(listing)
        out.host_display_name = host.display_name
        out.host_rating = round(host.rating_score, 1)
        out.node_status = node.status
        
        # Calculate marketplace reliability score
        score = (host.rating_score * 0.4) + (min(10.0, host.total_uptime_seconds / 86400) * 0.4) + ((10.0 / max(0.1, listing.price_per_hour)) * 0.2)
        out.reliability_score = round(score, 2)
        results.append(out)
        
    results.sort(key=lambda x: x.reliability_score or 0.0, reverse=True)
        
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
    print(f"DEBUG: create_deployment looking for listing_id: {deploy_in.listing_id}")
    listing = db.query(models.Listing).filter(
        models.Listing.id == str(deploy_in.listing_id), 
        models.Listing.status.in_(["active", "available"])
    ).first()
    if not listing:
        all_listings = db.query(models.Listing.id, models.Listing.status).all()
        print(f"DEBUG: Listing NOT found. Available listings in DB: {all_listings}")
        raise HTTPException(status_code=404, detail="Listing not found or inactive")
        
    node = db.query(models.Node).filter(models.Node.id == listing.node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    from utils.resources import reserve_resources
    ok = reserve_resources(db, listing.node_id, listing.cpu_offered, listing.ram_offered_gb, listing.storage_offered_gb)
    if not ok:
        raise HTTPException(status_code=409, detail="Insufficient resources on this node")
    
    subdomain = f"{deploy_in.name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}.edgecloud.local"
    
    if current_user.credit_balance <= 0:
        from utils.resources import release_resources
        release_resources(db, listing.node_id, listing.cpu_offered, listing.ram_offered_gb, listing.storage_offered_gb)
        raise HTTPException(402, "Insufficient credits. Add credits at POST /credits/add")
        
    from datetime import datetime
    
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
    import container_metrics
    deployments = db.query(models.Deployment).filter(models.Deployment.user_id == current_user.id).all()
    results = []
    for d in deployments:
        out = schemas.DeploymentOut.model_validate(d)
        if d.status == "running":
            m = container_metrics.get(str(d.id))
            if m:
                out.cpu_usage = int(m.get("cpu_percent", 0))
                # Calculate ram usage percent from memory_mb and memory_limit_mb
                mem_mb = m.get("memory_mb", 0)
                mem_limit = m.get("memory_limit_mb", 1)
                if mem_limit > 0:
                    out.ram_usage = int((mem_mb / mem_limit) * 100)
                else:
                    out.ram_usage = 0
            else:
                out.cpu_usage = 0
                out.ram_usage = 0
        else:
            out.cpu_usage = 0
            out.ram_usage = 0
        results.append(out)
    return results

@app.get("/deployments/{id}", response_model=schemas.DeploymentOut)
def get_deployment(id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    import container_metrics
    deployment = db.query(models.Deployment).filter(models.Deployment.id == id, models.Deployment.user_id == current_user.id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    out = schemas.DeploymentOut.model_validate(deployment)
    if deployment.status == "running":
        m = container_metrics.get(str(deployment.id))
        if m:
            out.cpu_usage = int(m.get("cpu_percent", 0))
            mem_mb = m.get("memory_mb", 0)
            mem_limit = m.get("memory_limit_mb", 1)
            if mem_limit > 0:
                out.ram_usage = int((mem_mb / mem_limit) * 100)
            else:
                out.ram_usage = 0
        else:
            out.cpu_usage = 0
            out.ram_usage = 0
    else:
        out.cpu_usage = 0
        out.ram_usage = 0
    return out

@app.get("/deployments/{id}/logs")
def get_deployment_logs(id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Return the last 100 log lines for a deployment.
    Logs are pushed by the node agent and stored in an in-memory ring buffer.
    Returns an empty list if the agent has not yet pushed any logs.
    """
    import log_store
    deployment = db.query(models.Deployment).filter(
        models.Deployment.id == id,
        models.Deployment.user_id == current_user.id
    ).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return {"logs": log_store.get(id)}

@app.post("/deployments/{id}/start")
def start_deployment(id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    deployment = db.query(models.Deployment).filter(models.Deployment.id == id, models.Deployment.user_id == current_user.id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    deployment.status = "running"
    deployment.last_error = None
    db.commit()
    return {"status": "running"}

@app.post("/deployments/{id}/stop")
def stop_deployment(id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    deployment = db.query(models.Deployment).filter(models.Deployment.id == id, models.Deployment.user_id == current_user.id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    deployment.status = "stopped"
    db.commit()
    return {"status": "stopped"}

@app.post("/deployments/{id}/restart")
def restart_deployment(id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    stop_deployment(id, current_user, db)
    start_deployment(id, current_user, db)
    return {"status": "restarted"}

@app.delete("/deployments/{id}")
def delete_deployment(id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    deployment = db.query(models.Deployment).filter(models.Deployment.id == id, models.Deployment.user_id == current_user.id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
        
    if deployment.status == "running":
        listing = db.query(models.Listing).filter(models.Listing.id == deployment.listing_id).first()
        node = db.query(models.Node).filter(models.Node.id == deployment.node_id).first()
        
        if node and listing:
            from utils.resources import release_resources
            release_resources(db, deployment.node_id, listing.cpu_offered, listing.ram_offered_gb, listing.storage_offered_gb)
            
            from datetime import datetime
            now = datetime.utcnow()
            last_billed_at = deployment.last_billed_at or deployment.started_at
            seconds_passed = (now - last_billed_at).total_seconds()
            
            if seconds_passed > 0:
                cost = round((seconds_passed / 3600.0) * listing.price_per_hour, 6)
                if cost > 0 and current_user.credit_balance >= cost:
                    current_user.credit_balance -= cost
                    tx = models.CreditTransaction(
                        id=str(uuid.uuid4()), 
                        user_id=current_user.id,
                        amount=-cost, 
                        description=f"Deployment final charge: {deployment.subdomain}",
                        created_at=now,
                        deployment_id=str(deployment.id),
                        node_id=str(deployment.node_id),
                        duration_seconds=int(seconds_passed),
                        price_per_minute=listing.price_per_hour / 60,
                        balance_after=current_user.credit_balance,
                        transaction_type="runtime"
                    )
                    db.add(tx)
            
    db.delete(deployment)
    db.commit()
    return {"status": "deleted"}

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

@app.patch("/nodes/{id}/limits", response_model=schemas.NodeOut)
def update_node_limits(id: str, limits: schemas.NodeUpdateLimits, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(models.Host).filter(models.Host.user_id == current_user.id).first()
    if not host:
        raise HTTPException(status_code=403, detail="Only hosts can update nodes")
        
    node = db.query(models.Node).filter(models.Node.id == id, models.Node.host_id == host.id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found or not owned by host")
        
    if limits.max_cpu_percent is not None:
        node.max_cpu_percent = limits.max_cpu_percent
    if limits.max_ram_percent is not None:
        node.max_ram_percent = limits.max_ram_percent
    if limits.enabled is not None:
        node.enabled = limits.enabled
        
    db.commit()
    db.refresh(node)
    return node
