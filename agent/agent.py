#!/usr/bin/env python3
import time
import requests
import docker
import json
import os
from pathlib import Path

CONFIG_FILE = Path(".edgecloud_node")
BACKEND_URL = os.getenv("EDGECLOUD_URL", "http://localhost:8000")

def load_config():
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text())
    return None

import sys

def register_node():
    import getpass
    print("\n--- Node Registration ---")
    print("Please login with your EdgeCloud Host account.")
    email = input("Email: ").strip()
    password = getpass.getpass("Password: ")
    
    # Login to get host token
    login_resp = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=10
    )
    if login_resp.status_code != 200:
        print("Login failed. Check email/password.")
        return
        
    host_token = login_resp.json()["access_token"]
    
    name = input("Node name (e.g. demo-node-1): ").strip() or "demo-node-1"
    
    # Fake/approximate specs using standard libraries to avoid extra pip installs
    cpu = os.cpu_count() or 4
    ram = 16.0
    disk = 100.0
    
    resp = requests.post(
        f"{BACKEND_URL}/nodes/register",
        json={"name": name, "cpu_total": cpu, "ram_total": ram, "storage_total_gb": disk},
        headers={"Authorization": f"Bearer {host_token}"},
        timeout=10,
    )
    if resp.status_code != 200:
        print(f"Registration failed (HTTP {resp.status_code}): {resp.text}")
        return

    data = resp.json()
    config = {"node_id": data["id"], "node_secret": data["node_secret"], "name": name}
    CONFIG_FILE.write_text(json.dumps(config, indent=2))
    print(f"\nRegistered! Node ID: {data['id']}. Config saved to .edgecloud_node.")
    print("You can now run 'python agent.py' without --register.")

def main():
    if "--register" in sys.argv:
        register_node()
        return

    config = load_config()
    if not config:
        print("Please run the full agent once with --register to generate .edgecloud_node config.")
        return

    node_secret = config["node_secret"]
    print(f"Starting simple demo agent. Connecting to {BACKEND_URL}...")
    
    try:
        client = docker.from_env()
    except Exception as e:
        print("Failed to connect to Docker. Is Docker running?")
        return

    # Tracking mapping: deployment_id -> container_id
    # We will map by container name 'edgecloud_<id>'
    
    while True:
        try:
            resp = requests.get(
                f"{BACKEND_URL}/agent/deployments",
                headers={"Authorization": f"Bearer {node_secret}"},
                timeout=5
            )
            if resp.status_code != 200:
                print(f"Failed to fetch deployments: {resp.text}")
                time.sleep(5)
                continue
                
            deployments = resp.json()
            
            # Get existing containers
            existing_containers = {}
            for c in client.containers.list(all=True, filters={"name": "edgecloud_"}):
                dep_id = c.name.replace("edgecloud_", "")
                existing_containers[dep_id] = c

            for dep in deployments:
                dep_id = dep["deployment_id"]
                status = dep["status"]
                image = dep["docker_image"]
                cpu_limit = dep["cpu_limit"]
                ram_limit = dep["ram_limit"]

                container = existing_containers.get(dep_id)
                container_running = container and container.status == "running"

                if status == "running" and not container_running:
                    # Cleanup old stopped container if it exists
                    if container:
                        container.remove(force=True)
                    
                    print(f"[PULLING] {image}...")
                    try:
                        client.images.pull(image)
                    except Exception as e:
                        print(f"Failed to pull {image}: {e}")
                        
                    # Run container
                    try:
                        # Convert limits
                        cpu_quota = int(cpu_limit * 100000) if cpu_limit else 100000
                        mem_limit_bytes = int(ram_limit * 1024 * 1024 * 1024) if ram_limit else 512*1024*1024
                        container_port = dep.get("container_port", 80)
                        env_vars = dep.get("env_vars")
                        env_dict = {}
                        if env_vars:
                            try:
                                import json
                                env_dict = json.loads(env_vars)
                            except:
                                pass

                        client.containers.run(
                            image,
                            name=f"edgecloud_{dep_id}",
                            detach=True,
                            cpu_period=100000,
                            cpu_quota=cpu_quota,
                            mem_limit=mem_limit_bytes,
                            ports={f"{container_port}/tcp": container_port},
                            environment=env_dict
                        )
                        print(f"[STARTED] deployment {dep_id} - Accessible at http://localhost:{container_port}")
                        
                        # Send log to backend (Optional Logs simple requirement)
                        requests.post(
                            f"{BACKEND_URL}/agent/push-logs",
                            headers={"Authorization": f"Bearer {node_secret}"},
                            json={"deployment_id": dep_id, "lines": ["Container started"]}
                        )
                    except Exception as e:
                        print(f"Failed to start container: {e}")

                elif status != "running" and container:
                    try:
                        container.stop(timeout=2)
                        container.remove(force=True)
                        print(f"[STOPPED] deployment {dep_id}")
                        
                        # Send log to backend
                        requests.post(
                            f"{BACKEND_URL}/agent/push-logs",
                            headers={"Authorization": f"Bearer {node_secret}"},
                            json={"deployment_id": dep_id, "lines": ["Container stopped"]}
                        )
                    except Exception as e:
                        print(f"Failed to stop container: {e}")

                # If running, gather and send metrics
                if status == "running" and container_running:
                    try:
                        stats = container.stats(stream=False)
                        
                        # CPU
                        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - stats.get('precpu_stats', {}).get('cpu_usage', {}).get('total_usage', 0)
                        system_cpu_delta = stats['cpu_stats'].get('system_cpu_usage', 0) - stats.get('precpu_stats', {}).get('system_cpu_usage', 0)
                        number_cpus = stats['cpu_stats'].get('online_cpus', 1)
                        cpu_percent = 0.0
                        if system_cpu_delta > 0.0 and cpu_delta > 0.0:
                            cpu_percent = (cpu_delta / system_cpu_delta) * number_cpus * 100.0

                        # Memory
                        mem_usage = stats['memory_stats'].get('usage', 0)
                        mem_limit_val = stats['memory_stats'].get('limit', 1)
                        mem_mb = mem_usage / (1024 * 1024)
                        mem_limit_mb = mem_limit_val / (1024 * 1024)
                        
                        print(f"[{dep_id}] CPU: {cpu_percent:.1f}% | RAM: {mem_mb:.1f}MB / {mem_limit_mb:.1f}MB")
                        
                        requests.post(
                            f"{BACKEND_URL}/agent/push-metrics",
                            headers={"Authorization": f"Bearer {node_secret}"},
                            json={"metrics": [{
                                "deployment_id": dep_id,
                                "cpu_percent": cpu_percent,
                                "memory_mb": mem_mb,
                                "memory_limit_mb": mem_limit_mb,
                                "uptime_seconds": 0
                            }]}
                        )
                    except Exception as e:
                        pass # Ignore intermittent stats errors

        except Exception as e:
            print(f"Agent loop error: {e}")
            
        time.sleep(5)

if __name__ == "__main__":
    main()
