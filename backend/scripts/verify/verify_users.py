import requests
import sys
import random

BASE_URL = "http://localhost:8000/api/v1"


def verify_users():
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

    # 1. List Users
    print("\n--- Listing Users ---")
    list_resp = requests.get(f"{BASE_URL}/users", headers=headers)
    if list_resp.status_code == 200:
        users = list_resp.json()
        print(f"✅ Found {len(users)} users")
    else:
        print(f"❌ List Users Failed: {list_resp.status_code}")
        sys.exit(1)

    # 2. Create Warehouse Manager
    print("\n--- Creating Warehouse Manager ---")
    mgr_email = f"manager_{random.randint(1000, 9999)}@example.com"
    mgr_data = {
        "email": mgr_email,
        "password": "password123",
        "full_name": "Test Manager",
        "role": "warehouse_manager",
        "is_active": True,
    }
    create_resp = requests.post(f"{BASE_URL}/users", json=mgr_data, headers=headers)
    if create_resp.status_code == 200:
        mgr = create_resp.json()
        mgr_id = mgr["id"]
        print(f"✅ Manager Created (ID: {mgr_id}, Role: {mgr.get('role')})")
    else:
        print(f"❌ Create Manager Failed: {create_resp.status_code}")
        print(create_resp.text)
        sys.exit(1)

    # 3. Create Dispatcher
    print("\n--- Creating Dispatcher ---")
    disp_email = f"dispatcher_{random.randint(1000, 9999)}@example.com"
    disp_data = {
        "email": disp_email,
        "password": "password123",
        "full_name": "Test Dispatcher",
        "role": "dispatcher",
        "is_active": True,
    }
    disp_resp = requests.post(f"{BASE_URL}/users", json=disp_data, headers=headers)
    if disp_resp.status_code == 200:
        disp = disp_resp.json()
        print(f"✅ Dispatcher Created (ID: {disp['id']}, Role: {disp.get('role')})")
    else:
        print(f"❌ Create Dispatcher Failed: {disp_resp.status_code}")
        print(disp_resp.text)

    # 4. Edit User
    print("\n--- Editing Manager ---")
    update_data = {"full_name": "Updated Manager Name"}
    upd_resp = requests.put(
        f"{BASE_URL}/users/{mgr_id}", json=update_data, headers=headers
    )
    if upd_resp.status_code == 200:
        updated_mgr = upd_resp.json()
        print(f"✅ Manager Updated: {updated_mgr['full_name']}")
        if updated_mgr["full_name"] == "Updated Manager Name":
            print("✅ Update Verified")
        else:
            print("❌ Update Mismatch")
    else:
        print(f"❌ Update Manager Failed: {upd_resp.status_code}")
        print(upd_resp.text)

    print("\n✅ USERS VERIFIED")


if __name__ == "__main__":
    verify_users()
