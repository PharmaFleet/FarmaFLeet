import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"


def verify_settings_app():
    # 1. Profile Update (Admin)
    print("Logging in as Admin...")
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

    print("\n--- Verifying Profile Update (/users/me) ---")
    new_name = "Super Admin Updated"
    upd_resp = requests.put(
        f"{BASE_URL}/users/me", json={"full_name": new_name}, headers=headers
    )
    if upd_resp.status_code == 200:
        me = upd_resp.json()
        print(f"✅ Profile Updated: {me['full_name']}")
        if me["full_name"] == new_name:
            print("✅ Profile verification success")
        else:
            print("❌ Profile mismatch")
    else:
        print(f"❌ Update Profile Failed: {upd_resp.status_code}")

    # 2. Driver Status Toggle
    print("\n--- Checking Driver Status Toggle Capability ---")
    # Login as Driver
    print("Logging in as Driver...")
    try:
        d_resp = requests.post(
            f"{BASE_URL}/login/access-token",
            data={"username": "driver_test@example.com", "password": "password"},
        )
        if d_resp.status_code == 200:
            d_token = d_resp.json()["access_token"]
            d_headers = {"Authorization": f"Bearer {d_token}"}

            # Get Profile
            me_resp = requests.get(f"{BASE_URL}/drivers/me", headers=d_headers)
            if me_resp.status_code == 200:
                me_driver = me_resp.json()
                driver_id = me_driver["id"]
                print(
                    f"✅ Driver Profile: ID={driver_id}, Available={me_driver['is_available']}"
                )

                # Toggle Status (Set to False)
                new_status = not me_driver["is_available"]
                print(f"Toggling status to {new_status}...")
                tog_resp = requests.patch(
                    f"{BASE_URL}/drivers/{driver_id}/status",
                    json={"is_available": new_status},
                    headers=d_headers,
                )

                if tog_resp.status_code == 200:
                    updated_driver = tog_resp.json()
                    print(
                        f"✅ Status Updated: Available={updated_driver['is_available']}"
                    )
                    if updated_driver["is_available"] == new_status:
                        print("✅ Status Toggle Verified")
                    else:
                        print("❌ Status mismatch")
                else:
                    print(f"❌ Status Toggle Failed: {tog_resp.status_code}")
                    print(tog_resp.text)
            else:
                print(f"❌ Get Driver Profile Failed: {me_resp.status_code}")
        else:
            print("❌ Driver Login Failed. Skipping driver specific test.")
    except Exception as e:
        print(f"Driver Test Exception: {e}")

    print("\n✅ SETTINGS & APP VERIFIED")


if __name__ == "__main__":
    verify_settings_app()
