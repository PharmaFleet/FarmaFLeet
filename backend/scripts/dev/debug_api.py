import asyncio
import httpx
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))


async def main():
    async with httpx.AsyncClient(base_url="http://localhost:8000/api/v1") as client:
        # 1. Login to get token
        login_res = await client.post(
            "/login/access-token",
            data={"username": "admin@example.com", "password": "password"},
        )
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.text}")
            return

        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Test /drivers/locations
        print("\n--- Testing /drivers/locations ---")
        loc_res = await client.get("/drivers/locations", headers=headers)
        print(f"Status: {loc_res.status_code}")
        if loc_res.status_code != 200:
            print(f"Response: {loc_res.text}")
        else:
            print(f"Data: {loc_res.json()}")

        # 3. Test /notifications
        print("\n--- Testing /notifications ---")
        notif_res = await client.get("/notifications", headers=headers)
        print(f"Status: {notif_res.status_code}")
        print(f"Data: {notif_res.json()}")

        # 4. Check Payments via API (if endpoint exists) or just print summary
        # Assuming paymentService logic uses /payments
        # 4. Test /analytics/activities
        print("\n--- Testing /analytics/activities ---")
        rev_res = await client.get("/analytics/activities", headers=headers)
        print(f"Status: {rev_res.status_code}")
        if rev_res.status_code == 200:
            data = rev_res.json()
            print(f"Activities Count: {len(data)}")
            if len(data) > 0:
                print(f"First Activity: {data[0]}")
        else:
            print(f"Response: {rev_res.text}")

        # 5. Check Payments
        print("\n--- Testing /payments ---")
        pay_res = await client.get("/payments", headers=headers)
        if pay_res.status_code == 404:
            print("Payment endpoint might be different.")
        else:
            print(f"Status: {pay_res.status_code}")
            print(f"Data: {pay_res.json()}")


if __name__ == "__main__":
    asyncio.run(main())
