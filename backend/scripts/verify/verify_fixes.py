import httpx
import asyncio

API_URL = "http://localhost:8000/api/v1"
TOKEN = "test_token_here_if_needed"  # In dev mode, we might need to login first or use a known token.
# For now, let's assume we can get a token or the endpoints are accessible if we follow login flow.


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


async def verify_analytics(token):
    print("\n--- Verifying Analytics ---")
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{API_URL}/analytics/activities", headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print("Data:", response.json()[:1])  # Print first item
            else:
                print("Error:", response.text)
        except Exception as e:
            print(f"Request failed: {e}")


async def verify_payments(token):
    print("\n--- Verifying Payments ---")
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        try:
            # Test GET / (pagination)
            response = await client.get(f"{API_URL}/payments", headers=headers)
            print(f"GET /payments Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Total Payments: {data.get('total')}")
            else:
                print("Error:", response.text)
        except Exception as e:
            print(f"Request failed: {e}")


async def main():
    token = await get_token()
    if token:
        await verify_analytics(token)
        await verify_payments(token)
    else:
        print("Skipping tests due to login failure")


if __name__ == "__main__":
    asyncio.run(main())
