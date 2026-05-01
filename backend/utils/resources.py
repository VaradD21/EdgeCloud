from sqlalchemy.orm import Session
from models import Node
from datetime import datetime

def reserve_resources(db: Session, node_id: str, cpu: float, ram_gb: float, storage_gb: float) -> bool:
    # Use with_for_update() to prevent race conditions (double booking)
    node = db.query(Node).filter(Node.id == node_id).with_for_update().first()
    if not node or not node.enabled:
        return False
    
    max_cpu_allowed = node.cpu_total * (node.max_cpu_percent / 100.0)
    max_ram_allowed = node.ram_total * (node.max_ram_percent / 100.0)
    
    cpu_free = max_cpu_allowed - node.cpu_reserved
    ram_free = max_ram_allowed - node.ram_reserved
    storage_free = node.storage_total_gb - node.storage_reserved_gb
    
    if cpu_free < cpu or ram_free < ram_gb or storage_free < storage_gb:
        return False
    
    node.cpu_reserved += cpu
    node.ram_reserved += ram_gb
    node.storage_reserved_gb += storage_gb
    
    db.commit()
    return True

def release_resources(db: Session, node_id: str, cpu: float, ram_gb: float, storage_gb: float):
    node = db.query(Node).filter(Node.id == node_id).with_for_update().first()
    if not node:
        return
    
    node.cpu_reserved = max(0.0, node.cpu_reserved - cpu)
    node.ram_reserved = max(0.0, node.ram_reserved - ram_gb)
    node.storage_reserved_gb = max(0.0, node.storage_reserved_gb - storage_gb)
    
    db.commit()

def get_node_availability(node: Node) -> dict:
    max_cpu_allowed = node.cpu_total * (node.max_cpu_percent / 100.0)
    max_ram_allowed = node.ram_total * (node.max_ram_percent / 100.0)

    cpu_avail = max_cpu_allowed - node.cpu_reserved
    ram_avail = max_ram_allowed - node.ram_reserved
    storage_avail = node.storage_total_gb - node.storage_reserved_gb
    
    return {
        "cpu_available": round(max(0, cpu_avail), 2),
        "ram_available_gb": round(max(0, ram_avail), 2),
        "storage_available_gb": round(storage_avail, 2),
        "cpu_used_percent": round((node.cpu_reserved / max_cpu_allowed * 100) if max_cpu_allowed > 0 else 0, 1),
        "ram_used_percent": round((node.ram_reserved / max_ram_allowed * 100) if max_ram_allowed > 0 else 0, 1),
        "storage_used_percent": round((node.storage_reserved_gb / node.storage_total_gb * 100) if node.storage_total_gb > 0 else 0, 1),
    }
