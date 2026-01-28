import httpx
import asyncio

API_URL = "http://localhost:8000/api/v1"


async def get_token():
    async with httpx.AsyncClient() as client:
        # Assuming we have a test user
        response = await client.post(
            f"{API_URL}/login/access-token",
            data={"username": "admin@example.com", "password": "password"},
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        print(f"Login failed: {response.text}")
        return None


async def verify_payments(token):
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        print("\n--- Verifying Payments ---")

        # 1. Test Listing with Params
        print("Testing LIST payments...")
        res = await client.get(f"{API_URL}/payments", headers=headers)
        if res.status_code == 200:
            data = res.json()
            items = data["items"]
            print(f"Total Payments: {data['total']}")
            if items:
                print(f"Sample Payment Driver Name: {items[0].get('driver_name')}")
                # Verify driver_name is present
                if "driver_name" not in items[0]:
                    print("ERROR: driver_name missing in response")
        else:
            print(f"Error listing payments: {res.text}")

        # 2. Test Filters
        print("Testing Status=PENDING...")
        res = await client.get(f"{API_URL}/payments?status=PENDING", headers=headers)
        if res.status_code == 200:
            print(f"Pending Payments: {res.json()['total']}")

        # 3. Test Verify specific payment (if any pending exist)
        # We need a pending payment ID first
        res = await client.get(f"{API_URL}/payments?status=PENDING", headers=headers)
        pending = res.json()["items"]
        if pending:
            p_id = pending[0]["id"]
            print(f"Attempting to verify payment {p_id}...")
            res = await client.post(f"{API_URL}/payments/{p_id}/clear", headers=headers)
            if res.status_code == 200:
                print("Verification Successful")
                # Confirm it's now verified
                res = await client.get(
                    f"{API_URL}/payments?search=TX-{p_id}", headers=headers
                )  # assuming we can find it back or just check list
                # Actually just check stats or detail if endpoint exists, or list again
            else:
                print(f"Verification Failed: {res.text}")
        else:
            print("No pending payments to verify.")


async def main():
    token = await get_token()
    if token:
        await verify_payments(token)


if __name__ == "__main__":
    asyncio.run(main())
