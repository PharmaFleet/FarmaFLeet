import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"


def verify_auth_suite():
    failures = []

    # 1. Test Valid Login
    print("Testing Valid Login...")
    login_payload = {"username": "admin@example.com", "password": "password"}
    try:
        response = requests.post(f"{BASE_URL}/login/access-token", data=login_payload)
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data["access_token"]
            print("✅ Valid Login Successful")
        else:
            print(f"❌ Valid Login Failed: {response.status_code}")
            failures.append("Valid Login")
            return False
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return False

    # 2. Test Invalid Login
    print("\nTesting Invalid Login...")
    invalid_payload = {"username": "admin@example.com", "password": "wrongpassword"}
    response = requests.post(f"{BASE_URL}/login/access-token", data=invalid_payload)
    if response.status_code == 400:
        print("✅ Invalid Login Handled Correctly (400)")
    else:
        print(
            f"❌ Invalid Login Failed Check: Expected 400, got {response.status_code}"
        )
        failures.append("Invalid Login Handling")

    # 3. Test Route Protection (Get Current User without token)
    print("\nTesting Route Protection...")
    response = requests.get(f"{BASE_URL}/users/me")
    if response.status_code == 401:
        print("✅ Route Protection Working (401)")
    else:
        print(f"❌ Route Protection Failed: Expected 401, got {response.status_code}")
        failures.append("Route Protection")

    # 4. Test Route Protection (Get Current User WITH token)
    print("\nTesting Protected Route Access...")
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if response.status_code == 200:
        print("✅ Protected Route Access Successful")
    else:
        print(f"❌ Protected Route Access Failed: {response.status_code}")
        failures.append("Protected Route Access")

    # 5. Test Logout
    print("\nTesting Logout...")
    response = requests.post(f"{BASE_URL}/logout", headers=headers)
    if response.status_code == 200:
        print("✅ Logout Successful")
    else:
        print(f"❌ Logout Failed: {response.status_code}")
        failures.append("Logout")

    if failures:
        print(f"\n❌ FAILURES: {', '.join(failures)}")
        sys.exit(1)
    else:
        print("\n✅ ALL AUTH TESTS PASSED")


if __name__ == "__main__":
    verify_auth_suite()
