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


async def verify_filters(token):
    print("\n--- Verifying Driver Filters ---")
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        # 1. Test Status=Online
        print("Testing Status=online...")
        res = await client.get(f"{API_URL}/drivers?status=online", headers=headers)
        if res.status_code == 200:
            drivers = res.json()["items"]
            print(f"Online Drivers: {len(drivers)}")
            for d in drivers:
                if not d["is_available"]:
                    print(f"Error: Found offline driver {d['id']} in online filter")
        else:
            print(f"Error: {res.text}")

        # 2. Test Status=Offline
        print("Testing Status=offline...")
        res = await client.get(f"{API_URL}/drivers?status=offline", headers=headers)
        if res.status_code == 200:
            drivers = res.json()["items"]
            print(f"Offline Drivers: {len(drivers)}")
            for d in drivers:
                if d["is_available"]:
                    print(f"Error: Found online driver {d['id']} in offline filter")
        else:
            print(f"Error: {res.text}")

        # 3. Test Vehicle Search
        print("Testing Vehicle Search (PHX)...")
        res = await client.get(f"{API_URL}/drivers?search=PHX", headers=headers)
        if res.status_code == 200:
            drivers = res.json()["items"]
            print(f"Drivers matching 'PHX': {len(drivers)}")
            for d in drivers:
                print(f" - {d['vehicle_info']}")
        else:
            print(f"Error: {res.text}")


async def main():
    token = await get_token()
    if token:
        await verify_filters(token)


if __name__ == "__main__":
    asyncio.run(main())
