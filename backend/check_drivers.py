import asyncio
from app.db.session import SessionLocal
from sqlalchemy import select
from app.models.user import User
from app.models.driver import Driver


async def check_drivers():
    async with SessionLocal() as db:
        # Get all drivers with their user info
        result = await db.execute(
            select(Driver, User).join(User, Driver.user_id == User.id)
        )
        drivers = result.all()

        print("\n=== DRIVERS IN DATABASE ===")
        if not drivers:
            print("No drivers found!")
        else:
            for driver, user in drivers:
                print(f"Driver ID: {driver.id}")
                print(f"  User ID: {user.id}")
                print(f"  Email: {user.email}")
                print(f"  Name: {user.full_name}")
                print(f"  Active: {user.is_active}")
                print(f"  Available: {driver.is_available}")
                print("-" * 30)

        return drivers


if __name__ == "__main__":
    asyncio.run(check_drivers())
