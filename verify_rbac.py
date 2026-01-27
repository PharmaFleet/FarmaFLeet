import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"


def login(email, password):
    response = requests.post(
        f"{BASE_URL}/login/access-token", data={"username": email, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    return None


def verify_rbac():
    # 1. Super Admin Access
    print("Testing Super Admin Access...")
    token = login("admin@example.com", "password")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users", headers=headers)
    if response.status_code == 200:
        print("✅ Super Admin can list users")
    else:
        print(f"❌ Super Admin failed to list users: {response.status_code}")

    # 2. Manager Access (Should Fail)
    print("\nTesting Manager Access (Restricted)...")
    token = login("manager@example.com", "password")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users", headers=headers)
    if response.status_code in [400, 403]:
        print(f"✅ Manager restricted from listing users ({response.status_code})")
    else:
        print(f"❌ Manager WAS PERMITTED to list users: {response.status_code}")

    # 3. Dispatcher Access (Should Fail)
    print("\nTesting Dispatcher Access (Restricted)...")
    token = login("dispatcher@example.com", "password")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users", headers=headers)
    if response.status_code in [400, 403]:
        print(f"✅ Dispatcher restricted from listing users ({response.status_code})")
    else:
        print(f"❌ Dispatcher WAS PERMITTED to list users: {response.status_code}")


if __name__ == "__main__":
    verify_rbac()
