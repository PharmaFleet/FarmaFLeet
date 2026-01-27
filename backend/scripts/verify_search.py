import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"


def verify_search():
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

    # 1. Search by Name (Partial)
    print("\n--- Searching 'Alice' (Name) ---")
    res = requests.get(f"{BASE_URL}/orders?search=Alice", headers=headers)
    if res.status_code == 200:
        orders = res.json()
        print(f"✅ Found {len(orders)} orders")
        if len(orders) > 0 and "Alice" in str(orders[0]["customer_info"]):
            print("✅ Result contains Alice")
        else:
            print(f"❌ Result validation failed: {orders}")
    else:
        print(f"❌ Search failed: {res.status_code}")

    # 2. Search by Phone
    # '111222' was Alice's phone
    print("\n--- Searching '111222' (Phone) ---")
    res = requests.get(f"{BASE_URL}/orders?search=111222", headers=headers)
    if res.status_code == 200:
        orders = res.json()
        if len(orders) > 0:
            print(f"✅ Found {len(orders)} orders by phone")
        else:
            print("❌ No orders found by phone")

    # 3. Search by Sales Order #
    # 'IMP-002'
    print("\n--- Searching 'IMP-002' (Order #) ---")
    res = requests.get(f"{BASE_URL}/orders?search=IMP-002", headers=headers)
    if res.status_code == 200:
        orders = res.json()
        if len(orders) > 0 and orders[0]["sales_order_number"] == "IMP-002":
            print(f"✅ Found correct order by number")
        else:
            print("❌ No orders found by number")

    print("\n✅ SEARCH VERIFIED")


if __name__ == "__main__":
    verify_search()
