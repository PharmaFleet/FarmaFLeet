import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "testdriver@pharmafleet.com"
PASSWORD = "test123"


def verify_fix():
    # 1. Login
    print(f"Logging in as {EMAIL}...")
    login_resp = requests.post(
        f"{BASE_URL}/login/access-token", data={"username": EMAIL, "password": PASSWORD}
    )

    if login_resp.status_code != 200:
        print(f"❌ Login failed: {login_resp.status_code} - {login_resp.text}")
        sys.exit(1)

    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful")

    # 2. Call /drivers/me/orders (The failing endpoint)
    print("Fetching /drivers/me/orders...")
    resp = requests.get(f"{BASE_URL}/drivers/me/orders", headers=headers)

    if resp.status_code == 200:
        print("✅ /drivers/me/orders returned 200 OK")
        orders = resp.json()
        print(f"   Received {len(orders)} orders")
        # print first order to verify structure
        if orders:
            print(f"   Sample Order: {orders[0]['sales_order_number']}")
    else:
        print(f"❌ /drivers/me/orders failed: {resp.status_code}")
        print(f"   Response: {resp.text}")
        sys.exit(1)


if __name__ == "__main__":
    verify_fix()
