import requests
import json

# Setup
order_id = 145  # Using the same order ID from previous tests
url = f"http://127.0.0.1:8000/api/v1/orders/{order_id}/proof-of-delivery"
token = "test_token"  # Assuming we might need a token if it's protected, but let's check the endpoint decorator
# The endpoint has `current_user: User = Depends(deps.get_current_active_user)`
# So we need a valid token.
# I'll use the login logic from reproduce_crash.py to get a token first.

login_url = "http://127.0.0.1:8000/api/v1/login/access-token"
login_data = {"username": "driver@pharmafleet.com", "password": "driver123"}

try:
    # 1. Login
    print("Logging in...")
    login_resp = requests.post(login_url, data=login_data)
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.text}")
        exit(1)

    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload POD
    # We will use a dummy URL for signature and photo
    payload = {
        "signature_url": "/static/uploads/dummy_sig.png",
        "photo_url": "/static/uploads/dummy_photo.jpg",
    }

    print(f"Sending POD to {url} with payload {payload}...")
    response = requests.post(url, json=payload, headers=headers)

    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")

    if response.status_code == 200:
        print("POD Upload Verification SUCCESS")
    else:
        print("POD Upload Verification FAILED")

except Exception as e:
    print(f"Error: {e}")
