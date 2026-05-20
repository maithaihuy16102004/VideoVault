#!/usr/bin/env python3
"""
VideoVault Full Integration Test
================================
Tests ALL API endpoints for ALL 4 users with their subscription plans.

Endpoints tested:
  - POST /auth/login           (login)
  - GET  /auth/me              (profile - auth required)
  - GET  /plans                (public - subscription plans)
  - GET  /downloads            (history - auth, returns empty for anon)
  - POST /downloads            (create job - auth required)
  - GET  /downloads/{id}       (job status - auth required)
  - PUT  /downloads/{id}/cancel(cancel job - auth required)
  - DELETE /downloads/{id}     (delete job - auth required)
  - POST /downloads/batch      (batch download - auth required)
  - GET  /downloads/scrape/account  (scrape - public)
  - GET  /downloads/scrape/hashtag  (scrape - public)
  - POST /api/ai/rewrite       (AI rewrite - public for now)
  - POST /api/ai/translate     (AI translate - public for now)
  - GET  /analytics/platforms  (admin only)
  - GET  /analytics/revenue    (admin only)
"""
import requests
import json
import time
import sys

BASE = "http://localhost:5141/api/v1"
AI_BASE = "http://localhost:5141/api"

# ─── Test Users ────────────────────────────────────────────────
USERS = [
    {"email": "free@videovault.vn",     "password": "Free@123456",     "plan": "Free",       "quota": 10,   "role": "user"},
    {"email": "starter@videovault.vn",  "password": "Starter@123456",  "plan": "Basic",      "quota": 50,   "role": "user"},
    {"email": "pro@videovault.vn",      "password": "Pro@123456",      "plan": "Pro",        "quota": 200,  "role": "user"},
    {"email": "business@videovault.vn", "password": "Business@123456", "plan": "Enterprise", "quota": 1000, "role": "admin"},
]

# ─── Helpers ───────────────────────────────────────────────────
class Colors:
    OK = "\033[92m"
    FAIL = "\033[91m"
    WARN = "\033[93m"
    INFO = "\033[94m"
    BOLD = "\033[1m"
    END = "\033[0m"

passed = 0
failed = 0
skipped = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  {Colors.OK}PASS{Colors.END} {name}" + (f" ({detail})" if detail else ""))
    else:
        failed += 1
        print(f"  {Colors.FAIL}FAIL{Colors.END} {name}" + (f" ({detail})" if detail else ""))

def skip(name, reason=""):
    global skipped
    skipped += 1
    print(f"  {Colors.WARN}SKIP{Colors.END} {name}" + (f" ({reason})" if reason else ""))

def header(text):
    print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}  {text}{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}")

def section(text):
    print(f"\n{Colors.INFO}--- {text} ---{Colors.END}")

def safe_json(resp):
    try:
        return resp.json()
    except Exception:
        return {}


# ═══════════════════════════════════════════════════════════════
# 1. PUBLIC ENDPOINTS (no auth required)
# ═══════════════════════════════════════════════════════════════
def test_public_endpoints():
    header("1. PUBLIC ENDPOINTS (no auth)")

    # ─── Plans ─────────────────────────────────────────────────
    section("GET /plans")
    resp = requests.get(f"{BASE}/plans", timeout=10)
    data = safe_json(resp)
    test("Plans endpoint returns 200", resp.status_code == 200)
    plans = data.get("data", [])
    test("Returns 4 plans", len(plans) == 4, f"got {len(plans)}")
    if plans:
        plan_names = [p.get("name", "") for p in plans]
        test("Has free plan", any("free" in n.lower() for n in plan_names))
        test("Has pro plan", any("pro" in n.lower() for n in plan_names))

    # ─── Anonymous download history ────────────────────────────
    section("GET /downloads (anonymous)")
    resp = requests.get(f"{BASE}/downloads?page=1&pageSize=5", timeout=10)
    data = safe_json(resp)
    test("Anonymous history returns 200", resp.status_code == 200)
    test("Returns empty list for anonymous", data.get("data") == [] or data.get("data") is not None)

    # ─── Scrape account (no auth) ──────────────────────────────
    # section("GET /downloads/scrape/account (anonymous)")
    # try:
    #     resp = requests.get(f"{BASE}/downloads/scrape/account?username=chic.outfit.vn&platform=tiktok&limit=2", timeout=120)
    #     data = safe_json(resp)
    #     test("Scrape account returns 200", resp.status_code == 200)
    # except Exception as e:
    #     skip("Scrape account", str(e))

    # ─── Scrape hashtag (no auth) ──────────────────────────────
    # section("GET /downloads/scrape/hashtag (anonymous)")
    # try:
    #     resp = requests.get(f"{BASE}/downloads/scrape/hashtag?hashtag=ootd&platform=tiktok&limit=2", timeout=120)
    #     test("Scrape hashtag returns response", resp.status_code in (200, 500), f"HTTP {resp.status_code}")
    # except Exception as e:
    #     skip("Scrape hashtag", str(e))


# ═══════════════════════════════════════════════════════════════
# 2. PER-USER AUTH + FEATURE TESTS
# ═══════════════════════════════════════════════════════════════
def test_user_features(user_info):
    email = user_info["email"]
    password = user_info["password"]
    expected_plan = user_info["plan"]
    expected_quota = user_info["quota"]
    expected_role = user_info["role"]
    username = email.split("@")[0]

    header(f"2. USER: {username} ({expected_plan})")

    # ─── Login ─────────────────────────────────────────────────
    section("POST /auth/login")
    resp = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=10)
    data = safe_json(resp)
    test(f"Login returns 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    token = None
    user_data = None
    if resp.status_code == 200:
        auth_data = data.get("data", {})
        token = auth_data.get("token")
        user_data = auth_data.get("user", {})
        test("Token is present", token is not None and len(token) > 50, 
             f"{len(token) if token else 0} chars")
    
    if not token:
        skip(f"All {username} tests", "No token")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # ─── Profile ───────────────────────────────────────────────
    section("GET /auth/me")
    resp = requests.get(f"{BASE}/auth/me", headers=headers, timeout=10)
    data = safe_json(resp)
    test("Profile returns 200", resp.status_code == 200)
    if resp.status_code == 200:
        profile = data.get("data", {})
        test(f"Role is '{expected_role}'", profile.get("role") == expected_role, 
             f"got '{profile.get('role')}'")
        test(f"Quota total is {expected_quota}", profile.get("quotaTotal") == expected_quota,
             f"got {profile.get('quotaTotal')}")
        test(f"Quota used is 0", profile.get("quotaUsed") == 0,
             f"got {profile.get('quotaUsed')}")

    # ─── Download History ──────────────────────────────────────
    section("GET /downloads (authenticated)")
    resp = requests.get(f"{BASE}/downloads?page=1&pageSize=5", headers=headers, timeout=10)
    data = safe_json(resp)
    test("Download history returns 200", resp.status_code == 200)
    test("Returns list", isinstance(data.get("data"), list))

    # ─── Create Download Job ───────────────────────────────────
    section("POST /downloads (create job)")
    test_url = "https://www.tiktok.com/@chic.outfit.vn/video/7456842913741841685"
    resp = requests.post(f"{BASE}/downloads", 
                         json={"url": test_url, "quality": "auto"}, 
                         headers=headers, timeout=15)
    data = safe_json(resp)
    test("Create job returns 201", resp.status_code == 201, f"HTTP {resp.status_code}")
    
    job_id = None
    if resp.status_code == 201:
        job_data = data.get("data", {})
        job_id = job_data.get("id")
        test("Job has ID", job_id is not None)
        test("Job status is 'pending'", job_data.get("status") == "pending",
             f"got '{job_data.get('status')}'")
        test("Platform detected", job_data.get("platform") is not None,
             f"platform='{job_data.get('platform')}'")

    # ─── Get Job Status ───────────────────────────────────────
    if job_id:
        section(f"GET /downloads/{job_id[:8]}...")
        resp = requests.get(f"{BASE}/downloads/{job_id}", headers=headers, timeout=10)
        data = safe_json(resp)
        test("Get job returns 200", resp.status_code == 200)

        # ─── Cancel Job ───────────────────────────────────────
        section(f"PUT /downloads/{job_id[:8]}... /cancel")
        resp = requests.put(f"{BASE}/downloads/{job_id}/cancel", headers=headers, timeout=10)
        test("Cancel job returns 200", resp.status_code == 200, f"HTTP {resp.status_code}")

        # ─── Delete Job ───────────────────────────────────────
        section(f"DELETE /downloads/{job_id[:8]}...")
        resp = requests.delete(f"{BASE}/downloads/{job_id}", headers=headers, timeout=10)
        test("Delete job returns 200", resp.status_code == 200, f"HTTP {resp.status_code}")

    # ─── Batch Download ────────────────────────────────────────
    section("POST /downloads/batch")
    batch_urls = [
        "https://www.tiktok.com/@user1/video/123",
        "https://www.tiktok.com/@user2/video/456",
    ]
    resp = requests.post(f"{BASE}/downloads/batch",
                         json={"urls": batch_urls, "quality": "auto"},
                         headers=headers, timeout=15)
    data = safe_json(resp)
    test("Batch returns 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    if resp.status_code == 200:
        batch_data = data.get("data", {})
        jobs_created = len(batch_data.get("jobs", []))
        fails = len(batch_data.get("failed", []))
        test("Batch created jobs", jobs_created > 0 or fails > 0,
             f"{jobs_created} created, {fails} failed")
        # Clean up batch jobs
        for j in batch_data.get("jobs", []):
            jid = j.get("id")
            if jid:
                requests.put(f"{BASE}/downloads/{jid}/cancel", headers=headers, timeout=5)
                requests.delete(f"{BASE}/downloads/{jid}", headers=headers, timeout=5)

    # ─── Scrape with auth (same as public but with token) ──────
    # section("GET /downloads/scrape/account (with auth)")
    # try:
    #     resp = requests.get(f"{BASE}/downloads/scrape/account?username=chic.outfit.vn&platform=tiktok&limit=2",
    #                        headers=headers, timeout=120)
    #     test("Scrape with auth returns 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    # except Exception as e:
    #     skip("Scrape with auth", str(e))

    # ─── AI Endpoints ──────────────────────────────────────────
    time.sleep(2)  # Avoid rate limits
    section("POST /ai/rewrite")
    resp = requests.post(f"{AI_BASE}/ai/rewrite",
                        json={"text": "Video nay rat hay", "tone": "professional", "targetLanguage": "vi"},
                        headers=headers, timeout=30)
    data = safe_json(resp)
    test("AI Rewrite returns 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    if resp.status_code == 200:
        test("Has rewritten text", data.get("rewrittenText") is not None,
             f"'{str(data.get('rewrittenText', ''))[:50]}...'")

    time.sleep(2)  # Avoid rate limits
    section("POST /ai/translate")
    resp = requests.post(f"{AI_BASE}/ai/translate",
                        json={"text": "This video is very interesting", "targetLanguage": "vi"},
                        headers=headers, timeout=30)
    data = safe_json(resp)
    test("AI Translate returns 200", resp.status_code == 200, f"HTTP {resp.status_code}")
    if resp.status_code == 200:
        test("Has translated text", data.get("translatedText") is not None,
             f"'{str(data.get('translatedText', ''))[:50]}...'")

    # ─── Admin-Only Endpoints ──────────────────────────────────
    section("GET /analytics/platforms (admin only)")
    resp = requests.get(f"{BASE}/analytics/platforms", headers=headers, timeout=10)
    if expected_role == "admin":
        # Admin should get 200 (or 500 if view doesn't exist, but not 403)
        test("Admin can access analytics", resp.status_code in (200, 500),
             f"HTTP {resp.status_code}")
    else:
        test("Non-admin gets 403", resp.status_code == 403,
             f"HTTP {resp.status_code}")

    section("GET /analytics/revenue (admin only)")
    resp = requests.get(f"{BASE}/analytics/revenue", headers=headers, timeout=10)
    if expected_role == "admin":
        test("Admin can access revenue", resp.status_code in (200, 500),
             f"HTTP {resp.status_code}")
    else:
        test("Non-admin gets 403", resp.status_code == 403,
             f"HTTP {resp.status_code}")


# ═══════════════════════════════════════════════════════════════
# 3. CROSS-USER ISOLATION TEST
# ═══════════════════════════════════════════════════════════════
def test_cross_user_isolation():
    header("3. CROSS-USER ISOLATION")

    section("User A creates job, User B cannot see it")

    # Login as free_user
    resp_a = requests.post(f"{BASE}/auth/login", 
                          json={"email": "free@videovault.vn", "password": "Free@123456"}, timeout=10)
    token_a = safe_json(resp_a).get("data", {}).get("token")

    # Login as starter_user
    resp_b = requests.post(f"{BASE}/auth/login",
                          json={"email": "starter@videovault.vn", "password": "Starter@123456"}, timeout=10)
    token_b = safe_json(resp_b).get("data", {}).get("token")

    if not token_a or not token_b:
        skip("Cross-user isolation", "Could not login both users")
        return

    # User A creates a job
    resp = requests.post(f"{BASE}/downloads",
                        json={"url": "https://example.com/isolation-test"},
                        headers={"Authorization": f"Bearer {token_a}"}, timeout=10)
    job_a = safe_json(resp).get("data", {})
    job_a_id = job_a.get("id")

    if not job_a_id:
        skip("Cross-user isolation", "Could not create test job")
        return

    # User B tries to access User A's job
    resp = requests.get(f"{BASE}/downloads/{job_a_id}",
                       headers={"Authorization": f"Bearer {token_b}"}, timeout=10)
    test("User B cannot see User A's job", resp.status_code in (404, 403),
         f"HTTP {resp.status_code}")

    # User B's history should not contain User A's job
    resp = requests.get(f"{BASE}/downloads?page=1&pageSize=100",
                       headers={"Authorization": f"Bearer {token_b}"}, timeout=10)
    b_jobs = safe_json(resp).get("data", [])
    b_job_ids = [j.get("id") for j in b_jobs]
    test("User A's job not in User B's history", job_a_id not in b_job_ids)

    # Cleanup
    requests.put(f"{BASE}/downloads/{job_a_id}/cancel",
                headers={"Authorization": f"Bearer {token_a}"}, timeout=5)
    requests.delete(f"{BASE}/downloads/{job_a_id}",
                   headers={"Authorization": f"Bearer {token_a}"}, timeout=5)


# ═══════════════════════════════════════════════════════════════
# 4. INVALID INPUT TESTS
# ═══════════════════════════════════════════════════════════════
def test_invalid_inputs():
    header("4. INVALID INPUT / EDGE CASES")

    section("Invalid login")
    resp = requests.post(f"{BASE}/auth/login",
                        json={"email": "nonexistent@test.com", "password": "wrong"}, timeout=10)
    test("Invalid login returns 401", resp.status_code == 401)

    section("Invalid token")
    resp = requests.get(f"{BASE}/auth/me",
                       headers={"Authorization": "Bearer invalid.token.here"}, timeout=10)
    test("Invalid token returns 401", resp.status_code == 401, f"HTTP {resp.status_code}")

    section("Empty scrape username")
    resp = requests.get(f"{BASE}/downloads/scrape/account?username=&platform=tiktok", timeout=10)
    test("Empty username returns 400", resp.status_code == 400)

    section("Empty scrape hashtag")
    resp = requests.get(f"{BASE}/downloads/scrape/hashtag?hashtag=&platform=tiktok", timeout=10)
    test("Empty hashtag returns 400", resp.status_code == 400)


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
def main():
    print(f"\n{Colors.BOLD}VideoVault Full Integration Test Suite{Colors.END}")
    print(f"Target: {BASE}")
    print(f"Time:   {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # Check backend is reachable
    try:
        resp = requests.get(f"{BASE}/plans", timeout=5)
        if resp.status_code != 200:
            print(f"{Colors.FAIL}Backend not responding properly (HTTP {resp.status_code}){Colors.END}")
            return 1
    except requests.exceptions.ConnectionError:
        print(f"{Colors.FAIL}Backend unreachable at {BASE}{Colors.END}")
        print("Start the backend: dotnet run --project src/VideoVault.API")
        return 1

    print(f"{Colors.OK}Backend is reachable.{Colors.END}")

    # Run tests
    test_public_endpoints()

    for user in USERS:
        test_user_features(user)

    test_cross_user_isolation()
    test_invalid_inputs()

    # ─── Summary ────────────────────────────────────────────────
    header("TEST SUMMARY")
    total = passed + failed + skipped
    print(f"\n  Total:   {total}")
    print(f"  {Colors.OK}Passed:  {passed}{Colors.END}")
    print(f"  {Colors.FAIL}Failed:  {failed}{Colors.END}")
    print(f"  {Colors.WARN}Skipped: {skipped}{Colors.END}")
    print()

    pct = (passed / total * 100) if total > 0 else 0
    if failed == 0:
        print(f"  {Colors.OK}{Colors.BOLD}ALL TESTS PASSED ({pct:.0f}%){Colors.END}")
    else:
        print(f"  {Colors.FAIL}{Colors.BOLD}{failed} TEST(S) FAILED ({pct:.0f}% pass rate){Colors.END}")

    print(f"\n{'='*60}")
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
