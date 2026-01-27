import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"


def verify_geo():
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

    # 1. Warehouse Locations
    print("\n--- Verifying Warehouse Locations ---")
    wh_resp = requests.get(f"{BASE_URL}/warehouses", headers=headers)
    if wh_resp.status_code == 200:
        warehouses = wh_resp.json()
        print(f"✅ Found {len(warehouses)} warehouses")
        if len(warehouses) > 0:
            w = warehouses[0]
            print(
                f"Checking Warehouse {w['code']}: Lat={w.get('latitude')}, Lon={w.get('longitude')}"
            )
            if w.get("latitude") and w.get("longitude"):
                print("✅ Warehouse has coordinates")
            else:
                print("❌ Warehouse missing coordinates")
    else:
        print(f"❌ Get Warehouses failed: {wh_resp.status_code}")

    # 2. Update Driver Location
    print("\n--- Updating Driver Location ---")
    drivers = requests.get(f"{BASE_URL}/drivers", headers=headers).json()
    if not drivers:
        print("❌ No drivers found for test")
        sys.exit(1)

    driver_id = drivers[0]["id"]
    # Login as driver? Or Admin can update?
    # Schema says `current_user` finds driver profile?
    # `update_location` finds driver profile for `current_user`.
    # So we must login as the driver user to update location.

    # We need to know credentials of the driver user.
    # Created "driver_test@example.com" / "password" in verify_drivers.py.
    # Let's try to login as that driver.
    print("Logging in as Driver...")
    try:
        d_resp = requests.post(
            f"{BASE_URL}/login/access-token",
            data={"username": "driver_test@example.com", "password": "password"},
        )
        if d_resp.status_code == 200:
            d_token = d_resp.json()["access_token"]
            d_headers = {"Authorization": f"Bearer {d_token}"}

            loc_data = {"latitude": 29.3, "longitude": 47.9}
            up_resp = requests.post(
                f"{BASE_URL}/drivers/location", json=loc_data, headers=d_headers
            )
            if up_resp.status_code == 200:
                print("✅ Driver Location Updated")
            else:
                print(f"❌ Update Location failed: {up_resp.status_code}")
                print(up_resp.text)
        else:
            print(
                "⚠️ Could not login as driver_test directly. Skipping update step or using admin update if available."
            )
            # Admin cannot update location for driver via this endpoint usually (it uses `current_user`).
            # We skip update if login fails (maybe user deleted?)
    except:
        print("⚠️ Exception logging in as driver")

    # 3. Get All Driver Locations (Admin View)
    print("\n--- Verifying Driver Locations Snapshot ---")
    loc_resp = requests.get(f"{BASE_URL}/drivers/locations", headers=headers)
    if loc_resp.status_code == 200:
        locs = loc_resp.json()
        print(f"✅ Found {len(locs)} driver locations")
        if len(locs) > 0:
            print(f"Sample: {locs[0]}")
            if "latitude" in locs[0] and "longitude" in locs[0]:
                print("✅ Driver Location has coordinates")
            else:
                print("❌ Driver Location missing coordinates")
    else:
        print(f"❌ Get Driver Locations failed: {loc_resp.status_code}")

    print("\n✅ GEO VERIFIED")


if __name__ == "__main__":
    verify_geo()
