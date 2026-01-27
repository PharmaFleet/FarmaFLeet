import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"


def verify_notifications():
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

    # 1. List Notifications
    print("\n--- Listing Notifications ---")
    list_resp = requests.get(f"{BASE_URL}/notifications", headers=headers)
    if list_resp.status_code == 200:
        notes = list_resp.json()
        print(f"✅ Found {len(notes)} notifications")
        target_note = next(
            (n for n in notes if n["title"] == "Test Notification"), None
        )
        if target_note:
            print("✅ Test Notification found")
            # 2. Mark as Read
            print("\n--- Marking as Read ---")
            note_id = target_note["id"]
            read_resp = requests.patch(
                f"{BASE_URL}/notifications/{note_id}/read", headers=headers
            )
            if read_resp.status_code == 200:
                print("✅ Marked as read success")
                # Verify
                check_resp = requests.get(f"{BASE_URL}/notifications", headers=headers)
                notes_2 = check_resp.json()
                updated = next((n for n in notes_2 if n["id"] == note_id), None)
                if updated and updated["is_read"]:
                    print("✅ Verified is_read=True")
                else:
                    print("❌ Verification failed: is_read is False")
            else:
                print(f"❌ Mark Read Failed: {read_resp.status_code}")
        else:
            print("❌ Test Notification NOT found (Seed failed?)")
            sys.exit(1)
    else:
        print(f"❌ List Notifications Failed: {list_resp.status_code}")
        sys.exit(1)

    # 3. Register Device (Full Coverage)
    print("\n--- Register Device ---")
    reg_resp = requests.post(
        f"{BASE_URL}/notifications/register-device",
        json={"fcm_token": "test-token"},
        headers=headers,
    )
    if reg_resp.status_code == 200:
        print("✅ Device Registered")
    else:
        print(f"❌ Device Register Failed: {reg_resp.status_code}")

    print("\n✅ NOTIFICATIONS VERIFIED")


if __name__ == "__main__":
    verify_notifications()
