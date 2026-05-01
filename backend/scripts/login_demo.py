import requests

BACKEND_URL = "http://localhost:8000"

def get_demo_token(email, password):
    resp = requests.post(f"{BACKEND_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    else:
        print(f"Login failed: {resp.text}")
        return None

if __name__ == "__main__":
    token = get_demo_token("alice@demo.com", "Demo1234!")
    if token:
        print("\n--- Alice's JWT Token ---")
        print(token)
        print("\nUse this token to register your node:")
        print(f"py agent.py --register --host-token \"{token}\"")
