import asyncio
import sys

sys.path.insert(0, ".")
import httpx
from app.core.config import settings

# Test Driver Credentials
EMAIL = "driver@pharmafleet.com"
PASSWORD = "driver123"
BASE_URL = "http://localhost:8000/api/v1"


async def test_status_toggle():
    async with httpx.AsyncClient() as client:
        # 1. Login
        print(f"Logging in as {EMAIL}...")
        login_res = await client.post(
            f"{BASE_URL}/login/access-token",
            data={"username": EMAIL, "password": PASSWORD},
        )

        if login_res.status_code != 200:
            print(f"❌ Login failed: {login_res.text}")
            return

        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful.")

        # 2. Set Online
        print("\nAttempting to set status to ONLINE...")
        res = await client.patch(
            f"{BASE_URL}/drivers/me/status",
            json={"is_available": True},
            headers=headers,
        )

        if res.status_code == 200:
            print(f"✅ Status updated: {res.json()['is_available']}")
        else:
            print(f"❌ Update failed: {res.status_code} - {res.text}")

        # 3. Check DB logic via API
        driver_res = await client.get(f"{BASE_URL}/drivers/me", headers=headers)
        if driver_res.status_code == 200:
            is_avail = driver_res.json()["is_available"]
            print(f"Current Status in DB: {'ONLINE' if is_avail else 'OFFLINE'}")

        # 4. Set Offline (Cleanup)
        # print("\nSetting back to OFFLINE...")
        # await client.patch(
        #     f"{BASE_URL}/drivers/me/status",
        #     json={"is_available": False},
        #     headers=headers
        # )


if __name__ == "__main__":
    asyncio.run(test_status_toggle())
