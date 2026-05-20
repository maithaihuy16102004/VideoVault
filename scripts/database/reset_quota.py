"""Reset quota for all 4 test users via POST /auth/reset-quota."""
import requests, sys

BASE = "http://localhost:5141/api/v1"
USERS = [
    {"email": "free@videovault.vn",     "password": "Free@123456"},
    {"email": "starter@videovault.vn",  "password": "Starter@123456"},
    {"email": "pro@videovault.vn",      "password": "Pro@123456"},
    {"email": "business@videovault.vn", "password": "Business@123456"},
]

print("Resetting quota for all test users...")
for u in USERS:
    r = requests.post(f"{BASE}/auth/login", json=u, timeout=10)
    if r.status_code != 200:
        print(f"  SKIP {u['email']} - login failed {r.status_code}")
        continue
    token = r.json()["data"]["token"]
    r2 = requests.post(f"{BASE}/auth/reset-quota",
                       headers={"Authorization": f"Bearer {token}"}, timeout=10)
    profile = requests.get(f"{BASE}/auth/me",
                           headers={"Authorization": f"Bearer {token}"}, timeout=10).json()["data"]
    print(f"  {'OK' if r2.status_code == 200 else 'FAIL'} {u['email']}: {profile['quotaUsed']}/{profile['quotaTotal']}")

print("Done!")
