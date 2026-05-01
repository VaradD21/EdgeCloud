import sys, os, uuid
from datetime import datetime, timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import User, Host, Node, Listing, Deployment, CreditTransaction
from auth import get_password_hash

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Seeding EdgeCloud demo data...")

def make_id(): return str(uuid.uuid4())

def make_user(email, password, role, balance=10.0):
    u = User(id=make_id(), email=email, password=get_password_hash(password), role=role, credit_balance=balance, created_at=datetime.utcnow())
    db.add(u); db.flush(); return u

def make_host(user, name, rating=7.0, uptime=0):
    h = Host(id=make_id(), user_id=user.id, display_name=name, rating_score=rating, total_uptime=uptime, total_uptime_seconds=uptime)
    db.add(h); db.flush(); return h

def make_node(host, name, cpu, ram, storage, status="online"):
    n = Node(id=make_id(), host_id=host.id, name=name, cpu_total=cpu, ram_total=ram, storage_total_gb=storage,
             cpu_reserved=0, ram_reserved=0, storage_reserved_gb=0, status=status, last_heartbeat=datetime.utcnow())
    db.add(n); db.flush(); return n

def make_listing(node, host, cpu, ram, storage, price, status="available"):
    l = Listing(id=make_id(), node_id=node.id, host_id=host.id, cpu_offered=cpu, ram_offered_gb=ram,
                storage_offered_gb=storage, price_per_hour=price, status=status)
    db.add(l); db.flush(); return l

# Users
alice_u = make_user("alice@demo.com", "Demo1234!", "host", 0)
bob_u   = make_user("bob@demo.com",   "Demo1234!", "host", 0)
buyer_u = make_user("buyer@demo.com", "Demo1234!", "buyer", 50.0)

# Hosts
alice = make_host(alice_u, "Alice's Rigs",  rating=8.7, uptime=3600*200)
bob   = make_host(bob_u,   "Bob's Server",  rating=6.2, uptime=3600*80)

# Nodes
a1 = make_node(alice, "gaming-rig-1",  cpu=8,  ram=16,  storage=500,  status="online")
a2 = make_node(alice, "old-desktop",   cpu=4,  ram=8,   storage=250,  status="online")
b1 = make_node(bob,   "home-server",   cpu=16, ram=32,  storage=1000, status="online")

# Listings
l1 = make_listing(a1, alice, cpu=2, ram=4,  storage=50,  price=0.05)
l2 = make_listing(a1, alice, cpu=4, ram=8,  storage=100, price=0.09)
l3 = make_listing(a2, alice, cpu=2, ram=4,  storage=50,  price=0.04)
l4 = make_listing(b1, bob,   cpu=4, ram=8,  storage=100, price=0.07)
l5 = make_listing(b1, bob,   cpu=8, ram=16, storage=200, price=0.13)

# Active deployments (reserve resources)
dep1 = Deployment(id=make_id(), listing_id=l1.id, user_id=buyer_u.id, node_id=a1.id,
    docker_image="nginx:latest", subdomain="mysite-a1b2c3.edgecloud.io", name="mysite",
    status="running", started_at=datetime.utcnow()-timedelta(hours=2),
    last_billed_at=datetime.utcnow()-timedelta(hours=2), total_cost=0)
db.add(dep1)
l1.status = "rented"
a1.cpu_reserved += 2; a1.ram_reserved += 4; a1.storage_reserved_gb += 50

dep2 = Deployment(id=make_id(), listing_id=l4.id, user_id=buyer_u.id, node_id=b1.id,
    docker_image="python:3.11-slim", subdomain="bot-d4e5f6.edgecloud.io", name="bot",
    status="running", started_at=datetime.utcnow()-timedelta(minutes=45),
    last_billed_at=datetime.utcnow()-timedelta(minutes=45), total_cost=0)
db.add(dep2)
l4.status = "rented"
b1.cpu_reserved += 4; b1.ram_reserved += 8; b1.storage_reserved_gb += 100

# Credit transactions for buyer
for desc, amt in [("Free starter credits", 10.0), ("Manual top-up", 50.0),
                  ("Deployment started: mysite-a1b2c3.edgecloud.io", -1.0),
                  ("Deployment started: bot-d4e5f6.edgecloud.io", -1.0)]:
    db.add(CreditTransaction(id=make_id(), user_id=buyer_u.id, amount=amt, description=desc, created_at=datetime.utcnow()))

db.commit()
print("\n[OK] Seed complete!")
print("  Buyer:  buyer@demo.com  / Demo1234!  (50 credits, 2 running deployments)")
print("  Host 1: alice@demo.com  / Demo1234!  (rating 8.7, 2 nodes online)")
print("  Host 2: bob@demo.com    / Demo1234!  (rating 6.2, 1 node online)")
db.close()
