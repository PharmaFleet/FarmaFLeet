import asyncio
from app.db.session import SessionLocal
from sqlalchemy import select
from app.models.user import User
from app.models.driver import Driver
from app.core.security import get_password_hash


async def create_test_driver():
    async with SessionLocal() as db:
        # Check if test driver exists
        result = await db.execute(
            select(User).where(User.email == "testdriver@pharmafleet.com")
        )
        existing = result.scalars().first()

        if existing:
            # Update password
            existing.hashed_password = get_password_hash("test123")
            existing.is_active = True
            db.add(existing)
            await db.commit()
            print("\n✅ Test driver password reset!")
            print(f"Email: testdriver@pharmafleet.com")
            print(f"Password: test123")
            return

        # Create new user
        user = User(
            email="testdriver@pharmafleet.com",
            hashed_password=get_password_hash("test123"),
            full_name="Test Driver",
            role="driver",
            is_active=True,
            is_superuser=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Create driver profile
        driver = Driver(
            user_id=user.id,
            is_available=True,
            warehouse_id=1,  # Default warehouse
        )
        db.add(driver)
        await db.commit()

        print("\n✅ Test driver created!")
        print(f"Email: testdriver@pharmafleet.com")
        print(f"Password: test123")


if __name__ == "__main__":
    asyncio.run(create_test_driver())
