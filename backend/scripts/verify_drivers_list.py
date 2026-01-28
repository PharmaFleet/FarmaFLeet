import requests
import sys
import json

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "admin@pharmafleet.com"
PASSWORD = "admin"  # Assuming admin exists, otherwise use test driver or superuser


# We need a token to list drivers usually
def verify_drivers_list():
    # 1. Login
    print(f"Logging in as {EMAIL}...")
    login_resp = requests.post(
        f"{BASE_URL}/login/access-token", data={"username": EMAIL, "password": PASSWORD}
    )

    token = None
    if login_resp.status_code == 200:
        token = login_resp.json()["access_token"]
        print("✅ Login successful")
    else:
        print(f"⚠️ Login failed: {login_resp.status_code}. Trying as testdriver...")
        # Try test driver if admin fails (though admin should exist)
        login_resp = requests.post(
            f"{BASE_URL}/login/access-token",
            data={"username": "testdriver@pharmafleet.com", "password": "test123"},
        )
        if login_resp.status_code == 200:
            token = login_resp.json()["access_token"]
            print("✅ Test Driver Login successful")
        else:
            print("❌ All logins failed.")
            sys.exit(1)

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Call /drivers
    print("Fetching /drivers...")
    resp = requests.get(f"{BASE_URL}/drivers", headers=headers)

    if resp.status_code == 200:
        data = resp.json()
        print("✅ /drivers returned 200 OK")
        print(json.dumps(data, indent=2))

        items = data.get("items", [])
        print(f"   Found {len(items)} drivers")

    else:
        print(f"❌ /drivers failed: {resp.status_code}")
        print(f"   Response: {resp.text}")
        sys.exit(1)


if __name__ == "__main__":
    verify_drivers_list()
