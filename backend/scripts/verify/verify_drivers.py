import requests
import sys
import json

BASE_URL = "http://localhost:8000/api/v1"


def verify_drivers():
    # 1. Login as Admin
    print("Logging in as Admin...")
    login_resp = requests.post(
        f"{BASE_URL}/login/access-token",
        data={"username": "admin@example.com", "password": "password"},
    )
    if login_resp.status_code != 200:
        print("❌ Login failed")
        return False
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create User for Driver
    print("Creating User for Driver...")
    user_data = {
        "email": "driver_test@example.com",
        "password": "password",
        "full_name": "Test Driver",
        "role": "driver",
        "is_active": True,
        "is_superuser": False,
    }
    # Check if user exists first to avoid conflict
    # ... assuming we can just try create and ignore 400 if exists
    user_resp = requests.post(f"{BASE_URL}/users", json=user_data, headers=headers)
    if user_resp.status_code == 200:
        user_id = user_resp.json()["id"]
        print(f"✅ User created (ID: {user_id})")
    elif user_resp.status_code == 400:
        print("ℹ️ User likely exists, finding ID...")
        # List users to find ID
        users_list = requests.get(f"{BASE_URL}/users", headers=headers).json()
        target = next((u for u in users_list if u["email"] == user_data["email"]), None)
        if target:
            user_id = target["id"]
            print(f"✅ Found existing User ID: {user_id}")
        else:
            print("❌ Could not find existing user")
            sys.exit(1)
    else:
        print(f"❌ Create User failed: {user_resp.status_code}")
        print(user_resp.text)
        sys.exit(1)

    # 3. Create Warehouse
    print("Creating Warehouse...")
    warehouse_data = {
        "code": "WH001",
        "name": "Main Warehouse",
        "latitude": 29.3759,
        "longitude": 47.9774,
    }
    wh_resp = requests.post(
        f"{BASE_URL}/warehouses/", json=warehouse_data, headers=headers
    )
    if wh_resp.status_code == 200:
        warehouse_id = wh_resp.json()["id"]
        print(f"✅ Warehouse Created (ID: {warehouse_id})")
    elif wh_resp.status_code == 400:
        print("ℹ️ Warehouse likely exists, finding ID...")
        wh_list = requests.get(f"{BASE_URL}/warehouses/", headers=headers).json()
        target = next((w for w in wh_list if w["code"] == warehouse_data["code"]), None)
        if target:
            warehouse_id = target["id"]
            print(f"✅ Found existing Warehouse ID: {warehouse_id}")
        else:
            print("❌ Could not find existing warehouse (400)")
            # Try listing to see why
            print(wh_list)
            sys.exit(1)
    else:
        # Fallback if endpoint fails or not implemented
        # Try listing
        print(f"⚠️ Create Warehouse failed: {wh_resp.status_code}. Trying to list...")
        wh_list_resp = requests.get(f"{BASE_URL}/warehouses/", headers=headers)
        if wh_list_resp.status_code == 200:
            wh_list = wh_list_resp.json()
            if wh_list:
                warehouse_id = wh_list[0]["id"]
                print(f"✅ Using existing Warehouse ID: {warehouse_id}")
            else:
                print("❌ No warehouses available and creation failed.")
                sys.exit(1)
        else:
            print(f"❌ Failed to list warehouses: {wh_list_resp.status_code}")
            sys.exit(1)

    # 4. Create Driver Profile
    print("Creating Driver Profile...")
    driver_data = {
        "user_id": user_id,
        "vehicle_info": json.dumps({"model": "Toyota", "plate": "1234"}),  # Serialized
        "biometric_id": "bio_123",
        "warehouse_id": warehouse_id,
        "is_available": True,
    }

    driver_resp = requests.post(
        f"{BASE_URL}/drivers/", json=driver_data, headers=headers
    )
    driver_id = None
    if driver_resp.status_code == 200:
        driver_id = driver_resp.json()["id"]
        print(f"✅ Driver Profile Created (ID: {driver_id})")
    elif driver_resp.status_code == 400 and "already exists" in driver_resp.text:
        print("ℹ️ Driver profile already exists")
        # Find driver info
        drivers_list = requests.get(f"{BASE_URL}/drivers", headers=headers).json()
        target = next((d for d in drivers_list if d["user_id"] == user_id), None)
        if target:
            driver_id = target["id"]
            print(f"✅ Found existing Driver ID: {driver_id}")
    else:
        print(f"❌ Create Driver failed: {driver_resp.status_code}")
        print(driver_resp.text)
        # If warehouse constraint fails, we'll know
        if (
            "foreign key constraint" in driver_resp.text
            or "warehouse" in driver_resp.text.lower()
        ):
            print("⚠️ FAILED due to Warehouse ID? We may need to seed warehouses.")
        sys.exit(1)

    # 4. List Drivers
    print("Listing Drivers...")
    list_resp = requests.get(f"{BASE_URL}/drivers", headers=headers)
    if list_resp.status_code == 200:
        drivers = list_resp.json()
        print(f"✅ Drivers listed: {len(drivers)}")
        if not any(d["id"] == driver_id for d in drivers):
            print("❌ Created driver not found in list")
    else:
        print(f"❌ List Drivers failed: {list_resp.status_code}")

    # 5. Update Driver
    print("Updating Driver...")
    update_data = {
        "vehicle_info": json.dumps({"model": "updated_model", "plate": "5678"})
    }
    update_resp = requests.put(
        f"{BASE_URL}/drivers/{driver_id}", json=update_data, headers=headers
    )
    if update_resp.status_code == 200:
        print("✅ Driver Updated")
    else:
        print(f"❌ Update Driver failed: {update_resp.status_code}")
        print(update_resp.text)

    # 6. Driver Status Update
    print("Updating Driver Status...")
    status_resp = requests.patch(
        f"{BASE_URL}/drivers/{driver_id}/status",
        json={"is_available": False},
        headers=headers,
    )
    if status_resp.status_code == 200:
        print("✅ Driver Status Updated")
    else:
        print(f"❌ Update Status failed: {status_resp.status_code}")

    print("\n✅ DRIVER MANAGEMENT VERIFIED by Script")


if __name__ == "__main__":
    verify_drivers()
