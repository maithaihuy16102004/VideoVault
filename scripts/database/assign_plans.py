#!/usr/bin/env python3
"""
Assign proper subscription plans to seeded users via direct DB update.
Dynamically reads plan IDs from the database.
"""
import psycopg2
import sys

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 5432,
    "dbname": "videovault",
    "user": "postgres",
    "password": "postgres",
}

# Username -> Plan name mapping (sort_order based)
USER_PLAN_MAP = [
    ("free_user",     0),  # First plan (free/lowest)
    ("starter_user",  1),  # Second plan
    ("pro_user",      2),  # Third plan
    ("business_user", 3),  # Fourth plan (highest)
]

def main():
    print("Connecting to PostgreSQL...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Get all plans sorted by sort_order
    cur.execute("SELECT id, name, display_name, quota_limit FROM subscription_plans ORDER BY sort_order")
    plans = cur.fetchall()
    print(f"Plans found: {len(plans)}")
    for plan_id, name, display, quota in plans:
        print(f"  {name:12s} ({display:15s}) → ID: {plan_id} | quota={quota}")

    if len(plans) < 4:
        print("ERROR: Expected 4 plans but found", len(plans))
        return 1

    print()

    # Update each user with the corresponding plan
    for username, sort_idx in USER_PLAN_MAP:
        if sort_idx >= len(plans):
            print(f"  SKIP {username} - no plan at index {sort_idx}")
            continue

        plan_id, plan_name, plan_display, quota = plans[sort_idx]

        cur.execute("""
            UPDATE users 
            SET subscription_plan_id = %s, 
                quota_total = %s,
                quota_used = 0,
                quota_reset_at = NOW() + INTERVAL '1 day'
            WHERE username = %s
            RETURNING id, username, role
        """, (str(plan_id), quota, username))

        row = cur.fetchone()
        if row:
            print(f"  OK {username:20s} -> {plan_display:15s} (quota: 0/{quota})")
        else:
            print(f"  SKIP {username:20s} -> Not found in DB")

    # Set business_user as admin
    cur.execute("""
        UPDATE users SET role = 'admin' WHERE username = 'business_user'
        RETURNING username
    """)
    if cur.fetchone():
        print(f"\n  ADMIN business_user -> Role upgraded to 'admin'")

    conn.commit()

    # Verify results
    print("\n--- Verification ---")
    cur.execute("""
        SELECT u.username, u.role, u.quota_used, u.quota_total, sp.name as plan_name, sp.display_name
        FROM users u
        LEFT JOIN subscription_plans sp ON u.subscription_plan_id = sp.id
        WHERE u.username IN ('free_user', 'starter_user', 'pro_user', 'business_user')
        ORDER BY sp.sort_order
    """)
    for row in cur.fetchall():
        username, role, q_used, q_total, plan, display = row
        print(f"  {username:20s} | {role:6s} | {display or 'N/A':15s} | Quota: {q_used}/{q_total}")

    cur.close()
    conn.close()

    print("\nDone!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
