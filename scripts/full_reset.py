import os
import subprocess
import time
import sys

# Paths
VENV_PYTHON = os.path.join("backend", "venv", "Scripts", "python.exe")
DB_FILE = os.path.join("backend", "edgecloud.db")

def run_cmd(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    return result.stdout

# 1. Kill existing processes
run_cmd("taskkill /F /IM python.exe /T")
time.sleep(2)

# 2. Delete database
if os.path.exists(DB_FILE):
    print(f"Deleting {DB_FILE}")
    os.remove(DB_FILE)

# 3. Install requirements
run_cmd(f"{VENV_PYTHON} -m pip install -r backend/requirements.txt psutil requests")

# 4. Seed database
run_cmd(f"{VENV_PYTHON} backend/scripts/seed.py")

# 5. Start backend in background
print("Starting backend...")
backend_process = subprocess.Popen([VENV_PYTHON, "-m", "uvicorn", "main:app", "--reload"], cwd="backend")
time.sleep(10)

# 6. Get token for Alice
token_output = run_cmd(f"{VENV_PYTHON} backend/scripts/login_demo.py")
print(token_output)

# Extract token
token = None
for line in token_output.splitlines():
    if line.strip() and not line.startswith("-") and len(line) > 100:
        token = line.strip()
        break

if token:
    print(f"Registering agent with token: {token[:20]}...")
    run_cmd(f"{VENV_PYTHON} agent/agent.py --register --host-token {token}")
    
    print("Starting agent heartbeat...")
    agent_process = subprocess.Popen([VENV_PYTHON, "agent/agent.py"], cwd=".")
    print("Everything is running!")
else:
    print("Failed to get token.")
