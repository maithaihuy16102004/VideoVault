#!/usr/bin/env python3
"""
Seed & Test: Tạo 4 user ứng với 4 subscription plans và test đăng nhập.
"""
import requests
import json
import sys

BASE = "http://localhost:5141/api/v1"

# 4 users tương ứng 4 plans
USERS = [
    {
        "email": "free@videovault.vn",
        "username": "free_user",
        "password": "Free@123456",
        "fullName": "Nguyễn Miễn Phí",
        "plan": "free",
    },
    {
        "email": "starter@videovault.vn",
        "username": "starter_user",
        "password": "Starter@123456",
        "fullName": "Trần Khởi Đầu",
        "plan": "starter",
    },
    {
        "email": "pro@videovault.vn",
        "username": "pro_user",
        "password": "Pro@123456",
        "fullName": "Lê Chuyên Nghiệp",
        "plan": "pro",
    },
    {
        "email": "business@videovault.vn",
        "username": "business_user",
        "password": "Business@123456",
        "fullName": "Phạm Doanh Nghiệp",
        "plan": "business",
    },
]

def separator():
    print("─" * 60)

def register_user(user_data):
    """Register a user via API."""
    payload = {
        "email": user_data["email"],
        "username": user_data["username"],
        "password": user_data["password"],
        "fullName": user_data["fullName"],
    }
    resp = requests.post(f"{BASE}/auth/register", json=payload, timeout=10)
    return resp

def login_user(email, password):
    """Login and get token."""
    payload = {"email": email, "password": password}
    resp = requests.post(f"{BASE}/auth/login", json=payload, timeout=10)
    return resp

def get_profile(token):
    """Get current user profile."""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE}/auth/me", headers=headers, timeout=10)
    return resp

def test_download_history(token):
    """Test GET /downloads (requires auth)."""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE}/downloads?page=1&pageSize=5", headers=headers, timeout=10)
    return resp

def test_scrape_anonymous():
    """Test scrape endpoint without auth (should work)."""
    resp = requests.get(f"{BASE}/downloads/scrape/account?username=chic.outfit.vn&platform=tiktok&limit=3", timeout=120)
    return resp


def main():
    print("🔧 VideoVault — Seed 4 Users & Test")
    separator()

    tokens = {}
    results = []

    # ─── Step 1: Register all users ────────────────────────────
    print("\n📝 STEP 1: Đăng ký 4 user...")
    separator()

    for user_data in USERS:
        resp = register_user(user_data)
        status = "✅" if resp.status_code in (200, 201) else "⚠️"

        if resp.status_code in (200, 201):
            data = resp.json()
            token = data.get("data", {}).get("token") or data.get("token")
            user_info = data.get("data", {}).get("user") or data.get("user", {})
            print(f"  {status} {user_data['username']:20s} → Plan: {user_data['plan']:10s} | ID: {user_info.get('id', 'N/A')}")
            tokens[user_data["username"]] = token
            results.append({"user": user_data["username"], "action": "register", "status": "OK"})
        elif resp.status_code == 400:
            # Likely already exists, try login
            err = resp.json().get("message", resp.text)
            if "already" in err.lower():
                print(f"  ℹ️  {user_data['username']:20s} → Đã tồn tại, thử đăng nhập...")
                login_resp = login_user(user_data["email"], user_data["password"])
                if login_resp.status_code == 200:
                    data = login_resp.json()
                    token = data.get("data", {}).get("token") or data.get("token")
                    print(f"  ✅ {user_data['username']:20s} → Đăng nhập thành công!")
                    tokens[user_data["username"]] = token
                    results.append({"user": user_data["username"], "action": "login", "status": "OK"})
                else:
                    print(f"  ❌ {user_data['username']:20s} → Đăng nhập thất bại: {login_resp.text[:100]}")
                    results.append({"user": user_data["username"], "action": "login", "status": "FAIL"})
            else:
                print(f"  ❌ {user_data['username']:20s} → {err[:80]}")
                results.append({"user": user_data["username"], "action": "register", "status": "FAIL"})
        else:
            print(f"  ❌ {user_data['username']:20s} → HTTP {resp.status_code}: {resp.text[:100]}")
            results.append({"user": user_data["username"], "action": "register", "status": "FAIL"})

    # ─── Step 2: Test profile for each user ────────────────────
    print("\n👤 STEP 2: Kiểm tra profile...")
    separator()

    for username, token in tokens.items():
        if not token:
            print(f"  ⏭️  {username:20s} → Không có token, bỏ qua")
            continue
        resp = get_profile(token)
        if resp.status_code == 200:
            profile = resp.json().get("data", resp.json())
            quota_used = profile.get("quotaUsed", "?")
            quota_total = profile.get("quotaTotal", "?")
            role = profile.get("role", "?")
            print(f"  ✅ {username:20s} → Role: {role:6s} | Quota: {quota_used}/{quota_total}")
        else:
            print(f"  ❌ {username:20s} → HTTP {resp.status_code}")

    # ─── Step 3: Test download history ─────────────────────────
    print("\n📥 STEP 3: Test download history (auth required)...")
    separator()

    for username, token in tokens.items():
        if not token:
            continue
        resp = test_download_history(token)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data.get("data", []))
            print(f"  ✅ {username:20s} → {count} downloads in history")
        else:
            print(f"  ❌ {username:20s} → HTTP {resp.status_code}")

    # ─── Step 4: Test anonymous scrape ─────────────────────────
    print("\n🔍 STEP 4: Test anonymous scrape (no auth)...")
    separator()
    print("  ⏳ Scraping chic.outfit.vn (limit=3)... có thể mất 30-60s")
    try:
        resp = test_scrape_anonymous()
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            video_count = data.get("videoCount", 0)
            print(f"  ✅ Scrape thành công! {video_count} video(s) found")
            if "videos" in data:
                for i, v in enumerate(data["videos"][:3], 1):
                    print(f"     #{i}: {v.get('title', 'N/A')[:50]}...")
        else:
            print(f"  ⚠️  HTTP {resp.status_code}: {resp.text[:100]}")
    except requests.exceptions.Timeout:
        print("  ⏰ Timeout sau 120s — scrape mất quá lâu")
    except requests.exceptions.ConnectionError:
        print("  ❌ Không kết nối được backend — kiểm tra http://localhost:5141")

    # ─── Summary ───────────────────────────────────────────────
    print("\n📊 KẾT QUẢ TỔNG HỢP")
    separator()
    total_ok = sum(1 for r in results if r["status"] == "OK")
    total_fail = sum(1 for r in results if r["status"] == "FAIL")
    print(f"  Thành công: {total_ok}/4")
    print(f"  Thất bại:   {total_fail}/4")
    print(f"  Tokens:     {len(tokens)}/4")
    separator()

    if tokens:
        print("\n🔑 THÔNG TIN ĐĂNG NHẬP:")
        separator()
        for user_data in USERS:
            print(f"  📧 {user_data['email']:30s} | 🔐 {user_data['password']:16s} | Plan: {user_data['plan']}")
    
    separator()
    print("✅ Done!")

    return 0 if total_fail == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
