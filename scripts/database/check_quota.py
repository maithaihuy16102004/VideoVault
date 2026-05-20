import requests, sys

BASE = "http://localhost:5141/api/v1"
users = [
    {"email": "free@videovault.vn",     "password": "Free@123456"},
    {"email": "starter@videovault.vn",  "password": "Starter@123456"},
    {"email": "pro@videovault.vn",      "password": "Pro@123456"},
    {"email": "business@videovault.vn", "password": "Business@123456"},
]

for u in users:
    r = requests.post(f"{BASE}/auth/login", json=u, timeout=10)
    if r.status_code == 200:
        d = r.json()["data"]["user"]
        print(f"{u['email']}: quota {d['quotaUsed']}/{d['quotaTotal']}")
    else:
        print(f"{u['email']}: login failed {r.status_code}")
