import requests
import json

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "driver@pharmafleet.com"
PASSWORD = "driver123"
ORDER_ID = 145


def login():
    url = f"{BASE_URL}/login/access-token"
    payload = {"username": EMAIL, "password": PASSWORD}
    # FastAPI OAuth2 typically uses form data for login
    response = requests.post(url, data=payload)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None


def update_status(token):
    url = f"{BASE_URL}/orders/{ORDER_ID}/status"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # The payload structure that mimics the app
    payload = {"status": "out_for_delivery"}

    print(f"Sending PATCH to {url} with payload {payload}")
    response = requests.patch(url, headers=headers, json=payload)

    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")


if __name__ == "__main__":
    token = login()
    if token:
        print("Login successful, updating status...")
        update_status(token)
