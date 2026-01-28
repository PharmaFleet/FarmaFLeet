import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.db.base import User, Driver
from app.core.config import settings

TARGET_EMAIL = "driver@pharmafleet.com"


async def check_driver():
    print(f"Checking for user: {TARGET_EMAIL}...")

    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Check User
        result = await db.execute(select(User).where(User.email == TARGET_EMAIL))
        user = result.scalars().first()

        if not user:
            print(f"❌ User with email '{TARGET_EMAIL}' does NOT exist.")
            return

        print(
            f"✅ User Found: ID={user.id}, Name='{user.full_name}', Role='{user.role}'"
        )

        # Check Driver Profile
        result = await db.execute(select(Driver).where(Driver.user_id == user.id))
        driver = result.scalars().first()

        if driver:
            print(f"✅ Driver Profile Found: ID={driver.id}")
            print(f"   - Vehicle: {driver.vehicle_info}")
            print(f"   - Status: {'Online' if driver.is_available else 'Offline'}")
            print(f"   - Warehouse ID: {driver.warehouse_id}")
        else:
            print(f"❌ No Driver profile found for this user.")


if __name__ == "__main__":
    asyncio.run(check_driver())
