import requests
import sys


def verify_login():
    url = "http://localhost:8000/api/v1/login/access-token"
    payload = {"username": "admin@example.com", "password": "password"}
    try:
        response = requests.post(url, data=payload)
        if response.status_code == 200:
            token = response.json()
            print("Login Successful!")
            print(f"Access Token: {token['access_token'][:20]}...")

            # Test Logout
            access_token = token["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            logout_url = "http://localhost:8000/api/v1/logout"
            logout_response = requests.post(logout_url, headers=headers)
            if logout_response.status_code == 200:
                print("Logout Successful!")
                return True
            else:
                print(f"Logout Failed: {logout_response.status_code}")
                return False
        else:
            print(f"Login Failed: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False


if __name__ == "__main__":
    success = verify_login()
    if not success:
        sys.exit(1)
