import sys, os, uuid
from datetime import datetime, timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from models import User, Host, Node, Listing

db = SessionLocal()
print("Adding more seed data to EdgeCloud...")

def make_id(): return str(uuid.uuid4())

alice = db.query(Host).filter(Host.display_name == "Alice's Rigs").first()
bob = db.query(Host).filter(Host.display_name == "Bob's Server").first()

if alice and bob:
    # Add new nodes
    a3 = Node(id=make_id(), host_id=alice.id, name="ml-gpu-rig", cpu_total=24, ram_total=64, storage_total_gb=2000,
             cpu_reserved=0, ram_reserved=0, storage_reserved_gb=0, status="online", last_heartbeat=datetime.utcnow())
    b2 = Node(id=make_id(), host_id=bob.id, name="edge-router-1", cpu_total=4, ram_total=8, storage_total_gb=100,
             cpu_reserved=0, ram_reserved=0, storage_reserved_gb=0, status="online", last_heartbeat=datetime.utcnow())
    
    db.add(a3)
    db.add(b2)
    db.flush()

    # Add new listings
    l_new1 = Listing(id=make_id(), node_id=a3.id, host_id=alice.id, cpu_offered=8, ram_offered_gb=32,
                storage_offered_gb=500, price_per_hour=0.45, status="available")
    l_new2 = Listing(id=make_id(), node_id=a3.id, host_id=alice.id, cpu_offered=16, ram_offered_gb=32,
                storage_offered_gb=1000, price_per_hour=0.85, status="available")
    l_new3 = Listing(id=make_id(), node_id=b2.id, host_id=bob.id, cpu_offered=2, ram_offered_gb=4,
                storage_offered_gb=50, price_per_hour=0.03, status="available")
    l_new4 = Listing(id=make_id(), node_id=b2.id, host_id=bob.id, cpu_offered=2, ram_offered_gb=4,
                storage_offered_gb=50, price_per_hour=0.03, status="available")

    db.add_all([l_new1, l_new2, l_new3, l_new4])
    db.commit()
    print("Added 2 new nodes and 4 new available listings.")
else:
    print("Could not find Alice or Bob to add nodes to.")

db.close()
