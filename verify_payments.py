import requests
import sys
import random

BASE_URL = "http://localhost:8000/api/v1"


def verify_payments():
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

    # 1. Setup Data (Warehouse, Driver, Order)
    print("\n--- Setup ---")
    wh_list = requests.get(f"{BASE_URL}/warehouses", headers=headers).json()
    if not wh_list:
        print("❌ No warehouses found")
        sys.exit(1)
    warehouse_id = wh_list[0]["id"]

    drv_list = requests.get(f"{BASE_URL}/drivers", headers=headers).json()
    if not drv_list:
        print("❌ No drivers found")
        sys.exit(1)
    driver_id = drv_list[0]["id"]

    # Create Order
    print("Creating Order for Payment...")
    order_num = f"PAY-{random.randint(1000, 9999)}"
    order_data = {
        "sales_order_number": order_num,
        "customer_info": {"name": "Pay User", "phone": "123"},
        "total_amount": 50.0,
        "payment_method": "CASH",
        "warehouse_id": warehouse_id,
    }
    create_resp = requests.post(f"{BASE_URL}/orders", json=order_data, headers=headers)
    if create_resp.status_code != 200:
        print(f"❌ Create Order failed: {create_resp.status_code}")
        sys.exit(1)
    order_id = create_resp.json()["id"]
    print(f"✅ Order Created (ID: {order_id})")

    # Assign (Optional but good for realism)
    requests.post(
        f"{BASE_URL}/orders/{order_id}/assign",
        json={"driver_id": driver_id},
        headers=headers,
    )

    # 2. Collect Payment
    print("\n--- Collecting Payment ---")
    pay_data = {
        "order_id": order_id,
        "driver_id": driver_id,
        "amount": 50.0,
        "method": "CASH",
    }
    coll_resp = requests.post(
        f"{BASE_URL}/payments/collection", json=pay_data, headers=headers
    )
    if coll_resp.status_code == 200:
        payment = coll_resp.json()
        payment_id = payment["id"]
        print(f"✅ Payment Collected (ID: {payment_id})")
    else:
        print(f"❌ Collect Payment Failed: {coll_resp.status_code}")
        print(coll_resp.text)
        sys.exit(1)

    # 3. List Pending Payments
    print("\n--- Listing Pending Payments ---")
    pend_resp = requests.get(f"{BASE_URL}/payments/pending", headers=headers)
    if pend_resp.status_code == 200:
        pending = pend_resp.json()
        print(f"✅ Found {len(pending)} pending payments")
        if any(p["id"] == payment_id for p in pending):
            print("✅ Created payment found in pending list")
        else:
            print("❌ Created payment NOT found in pending list")
    else:
        print(f"❌ List Pending Failed: {pend_resp.status_code}")

    # 4. Verify/Clear Payment
    print("\n--- Clearing Payment ---")
    clear_resp = requests.post(
        f"{BASE_URL}/payments/{payment_id}/clear", headers=headers
    )
    if clear_resp.status_code == 200:
        print("✅ Payment Cleared")
    else:
        print(f"❌ Clear Payment Failed: {clear_resp.status_code}")
        print(clear_resp.text)

    # Verify it is no longer pending
    pend_resp_2 = requests.get(f"{BASE_URL}/payments/pending", headers=headers).json()
    if not any(p["id"] == payment_id for p in pend_resp_2):
        print("✅ Payment no longer in pending list")
    else:
        print("❌ Payment still in pending list")

    # 5. Payment Report
    print("\n--- Payment Report ---")
    rep_resp = requests.get(f"{BASE_URL}/payments/report", headers=headers)
    if rep_resp.status_code == 200:
        report = rep_resp.json()
        print(f"✅ Report generated: {report}")
        # Check for CASH total
        cash_entry = next((r for r in report if r["method"] == "CASH"), None)
        if cash_entry and cash_entry["total"] >= 50.0:
            print("✅ CASH total reflects payment")
        else:
            print("⚠️ CASH total might not reflect payment (or is 0)")
    else:
        print(f"❌ Report Failed: {rep_resp.status_code}")

    print("\n✅ PAYMENTS VERIFIED")


if __name__ == "__main__":
    verify_payments()
