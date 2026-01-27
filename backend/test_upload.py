import requests
import os

# Configuration
API_URL = "http://localhost:8000/api/v1"
LOGIN_URL = f"{API_URL}/login/access-token"
IMPORT_URL = f"{API_URL}/orders/import"
FILE_PATH = "e:/Py/Delivery-System-III/Sales orders_639045087241734537.xlsx"

# Credentials (using default superuser or seeded manager)
USERNAME = "admin@example.com"  # Adjust if needed
PASSWORD = "admin"  # Adjust if needed (default seed usually 'admin' or 'driver123')


def test_import():
    print(f"1. Logging in as {USERNAME}...")
    try:
        resp = requests.post(
            LOGIN_URL, data={"username": USERNAME, "password": PASSWORD}
        )
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code} {resp.text}")
            # Try driver/manager credentials if admin fails
            print("Retrying with manager credentials...")
            resp = requests.post(
                LOGIN_URL,
                data={"username": "manager@example.com", "password": "password"},
            )
            if resp.status_code != 200:
                print(f"Manager Login failed: {resp.status_code} {resp.text}")
                return
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    token = resp.json()["access_token"]
    print(f"Login successful. Token: {token[:10]}...")

    print(f"2. Uploading file: {FILE_PATH}...")
    if not os.path.exists(FILE_PATH):
        print(f"File not found: {FILE_PATH}")
        return

    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": open(FILE_PATH, "rb")}

    try:
        # requests automatically sets multipart/form-data with boundary
        resp = requests.post(IMPORT_URL, headers=headers, files=files)
        print(f"Response Status: {resp.status_code}")
        print(f"Response Body: {resp.text}")
        print(f"Response Headers: {resp.headers}")
    except Exception as e:
        print(f"Upload failed: {e}")


if __name__ == "__main__":
    test_import()
