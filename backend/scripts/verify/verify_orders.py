import requests
import sys
import json
import random

BASE_URL = "http://localhost:8000/api/v1"


def verify_orders():
    # 1. Login
    print("Logging in...")
    login_resp = requests.post(
        f"{BASE_URL}/login/access-token",
        data={"username": "admin@example.com", "password": "password"},
    )
    if login_resp.status_code != 200:
        print("❌ Login failed")
        sys.exit(1)
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Find Warehouse
    wh_list = requests.get(f"{BASE_URL}/warehouses", headers=headers).json()
    if not wh_list:
        print("❌ No warehouses found")
        sys.exit(1)
    warehouse_id = wh_list[0]["id"]
    print(f"✅ Using Warehouse ID: {warehouse_id}")

    # 3. Find Driver
    drv_list = requests.get(f"{BASE_URL}/drivers", headers=headers).json()
    if not drv_list:
        print("❌ No drivers found")
        sys.exit(1)
    driver_id = drv_list[0]["id"]
    print(f"✅ Using Driver ID: {driver_id}")

    # 4. Create Order
    print("Creating Order...")
    order_num = f"SO-{random.randint(1000, 9999)}"
    order_data = {
        "sales_order_number": order_num,
        "customer_info": {
            "name": "John Doe",
            "phone": "55512345",
            "address": "Block 1, Street 2, House 3",
            "area": "Kuwait City",
        },
        "total_amount": 50.0,
        "payment_method": "CASH",
        "warehouse_id": warehouse_id,
    }
    create_resp = requests.post(f"{BASE_URL}/orders", json=order_data, headers=headers)
    if create_resp.status_code == 200:
        order_id = create_resp.json()["id"]
        print(f"✅ Order Created (ID: {order_id})")
    else:
        print(f"❌ Create Order failed: {create_resp.status_code}")
        print(create_resp.text)
        sys.exit(1)

    # 5. List Orders (Filter)
    print("Listing Pending Orders...")
    list_resp = requests.get(f"{BASE_URL}/orders?status=pending", headers=headers)
    if list_resp.status_code == 200:
        orders = list_resp.json()
        if any(o["id"] == order_id for o in orders):
            print("✅ Created order found in pending list")
        else:
            print("❌ Created order NOT found in pending list")

    # 6. Assign Order
    print(f"Assigning Order {order_id} to Driver {driver_id}...")
    assign_resp = requests.post(
        f"{BASE_URL}/orders/{order_id}/assign",
        json={"driver_id": driver_id},
        headers=headers,
    )
    if assign_resp.status_code == 200:
        print("✅ Order Assigned")
        # Verify status
        curr = requests.get(f"{BASE_URL}/orders/{order_id}", headers=headers).json()
        if curr["status"] == "assigned" and curr["driver_id"] == driver_id:
            print("✅ Status Verified: assigned")
        else:
            print(f"❌ Status mismatch: {curr['status']}")
    else:
        print(f"❌ Assign Failed: {assign_resp.status_code}")
        print(assign_resp.text)

    # 7. Unassign Order
    print("Unassigning Order...")
    unassign_resp = requests.post(
        f"{BASE_URL}/orders/{order_id}/unassign", headers=headers
    )
    if unassign_resp.status_code == 200:
        print("✅ Order Unassigned")
        curr = requests.get(f"{BASE_URL}/orders/{order_id}", headers=headers).json()
        if curr["status"] == "pending" and curr["driver_id"] is None:
            print("✅ Status Verified: pending")
        else:
            print(f"❌ Status mismatch after unassign: {curr['status']}")
    else:
        print(f"❌ Unassign Failed: {unassign_resp.status_code}")

    # 8. Cancel Order (Update Status)
    print("Cancelling Order...")
    # Note: Using patch status
    cancel_resp = requests.patch(
        f"{BASE_URL}/orders/{order_id}/status",
        json={"status": "cancelled", "notes": "Customer cancelled"},
        headers=headers,
    )
    if cancel_resp.status_code == 200:
        print("✅ Order Cancelled")
        curr = requests.get(f"{BASE_URL}/orders/{order_id}", headers=headers).json()
        if curr["status"] == "cancelled":
            print("✅ Status Verified: cancelled")
        else:
            print(f"❌ Status mismatch after cancel: {curr['status']}")
    else:
        print(f"❌ Cancel Failed: {cancel_resp.status_code}")
        print(cancel_resp.text)

    print("\n✅ ORDER MANAGEMENT VERIFIED")


if __name__ == "__main__":
    verify_orders()
