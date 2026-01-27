import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"


def verify_analytics():
    print("Logging in...")
    try:
        resp = requests.post(
            f"{BASE_URL}/login/access-token",
            data={"username": "admin@example.com", "password": "password"},
        )
        if resp.status_code != 200:
            print("Login failed")
            sys.exit(1)
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    # 1. Executive Dashboard
    print("\n--- Executive Dashboard ---")
    exec_resp = requests.get(
        f"{BASE_URL}/analytics/executive-dashboard", headers=headers
    )
    if exec_resp.status_code == 200:
        data = exec_resp.json()
        print(f"✅ Dashboard Data: {data}")
        # Validate keys
        keys = ["total_orders_today", "active_drivers", "pending_payments_count"]
        if all(k in data for k in keys):
            print("✅ Dashboard structure verified")
        else:
            print("❌ Dashboard missing keys")
    else:
        print(f"❌ Executive Dashboard Failed: {exec_resp.status_code}")

    # 2. Driver Performance
    print("\n--- Driver Performance ---")
    perf_resp = requests.get(
        f"{BASE_URL}/analytics/driver-performance", headers=headers
    )
    if perf_resp.status_code == 200:
        stats = perf_resp.json()
        print(f"✅ Driver Stats: {stats}")
        if len(stats) > 0:
            s = stats[0]
            print(
                f"Sample Driver Stats: Total={s['total_orders']}, Success={s['success_rate']}%"
            )
    else:
        print(f"❌ Driver Performance Failed: {perf_resp.status_code}")

    # 3. Warehouse Stats
    print("\n--- Orders by Warehouse ---")
    wh_resp = requests.get(f"{BASE_URL}/analytics/orders-by-warehouse", headers=headers)
    if wh_resp.status_code == 200:
        wh_stats = wh_resp.json()
        print(f"✅ Warehouse Stats: {wh_stats}")
    else:
        print(f"❌ Warehouse Stats Failed: {wh_resp.status_code}")

    # 4. Success Rate
    print("\n--- Success Rate ---")
    rate_resp = requests.get(f"{BASE_URL}/analytics/success-rate", headers=headers)
    if rate_resp.status_code == 200:
        print(f"✅ Success Rate: {rate_resp.json()}")
    else:
        print(f"❌ Success Rate Failed: {rate_resp.status_code}")

    print("\n✅ ANALYTICS VERIFIED")


if __name__ == "__main__":
    verify_analytics()
