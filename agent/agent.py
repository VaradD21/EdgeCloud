import time
import requests
import psutil
import socket

API_URL = "http://localhost:8000"

# You would configure these for the actual node runner
EMAIL = "host@edgecloud.local"
PASSWORD = "password123"
DISPLAY_NAME = socket.gethostname()

def authenticate():
    print(f"Authenticating as {EMAIL}...")
    try:
        # Register if needed
        requests.post(f"{API_URL}/auth/register", json={
            "email": EMAIL,
            "password": PASSWORD,
            "role": "host"
        })
    except Exception as e:
        pass
        
    # Login
    res = requests.post(f"{API_URL}/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    res.raise_for_status()
    token = res.json()["access_token"]
    print("Authenticated successfully.")
    return {"Authorization": f"Bearer {token}"}

def register_host(headers):
    # Try to get host
    res = requests.get(f"{API_URL}/hosts/me", headers=headers)
    if res.status_code == 404:
        print("Registering new host profile...")
        res = requests.post(f"{API_URL}/hosts/register", headers=headers, json={
            "display_name": DISPLAY_NAME
        })
        res.raise_for_status()
        return res.json()["id"]
    res.raise_for_status()
    return res.json()["id"]

def register_node(headers):
    cpu_total = float(psutil.cpu_count(logical=True))
    ram_total = psutil.virtual_memory().total / (1024 ** 3) # in GB
    print(f"Registering node with {cpu_total} CPU threads and {ram_total:.2f} GB RAM...")
    res = requests.post(f"{API_URL}/nodes/register", headers=headers, json={
        "cpu_total": cpu_total,
        "ram_total": ram_total
    })
    res.raise_for_status()
    node_id = res.json()["id"]
    print(f"Node registered with ID: {node_id}")
    return node_id

def send_heartbeat(headers, node_id):
    cpu_usage = psutil.cpu_percent(interval=1)
    ram_usage = psutil.virtual_memory().percent
    
    try:
        res = requests.post(f"{API_URL}/nodes/heartbeat", headers=headers, json={
            "node_id": node_id,
            "cpu_usage": cpu_usage,
            "ram_usage": ram_usage
        })
        res.raise_for_status()
        print(f"Heartbeat sent! CPU: {cpu_usage}% | RAM: {ram_usage}%")
    except Exception as e:
        print(f"Failed to send heartbeat: {e}")

def run():
    print("Starting Edgecloud Node Agent...")
    headers = authenticate()
    host_id = register_host(headers)
    node_id = register_node(headers)
    
    print("Starting heartbeat loop (every 30 seconds)...")
    try:
        while True:
            send_heartbeat(headers, node_id)
            time.sleep(30)
    except KeyboardInterrupt:
        print("Shutting down agent.")

if __name__ == "__main__":
    # Ensure backend is up
    time.sleep(2)
    run()
