import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from app.db.base import Driver, User
from app.core.config import settings

TEST_DRIVER_EMAIL = "testdriver@pharmafleet.com"


async def reset_driver_status():
    print("Resetting driver statuses...")

    # Create engine directly using settings
    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    print("Connecting to DB...")

    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Find the test driver user first
        result = await db.execute(select(User).where(User.email == TEST_DRIVER_EMAIL))
        test_user = result.scalars().first()

        test_driver_id = None
        if test_user:
            driver_result = await db.execute(
                select(Driver).where(Driver.user_id == test_user.id)
            )
            test_driver = driver_result.scalars().first()
            if test_driver:
                test_driver_id = test_driver.id
                print(
                    f"Found test driver ID: {test_driver_id} (User: {test_user.email})"
                )

        # 1. Set EVERYONE to offline first (simplest approach)
        print("Setting ALL drivers to offline...")
        await db.execute(update(Driver).values(is_available=False))

        # 2. Set test driver to online if found
        if test_driver_id:
            print(f"Setting test driver {test_driver_id} to ONLINE...")
            await db.execute(
                update(Driver)
                .where(Driver.id == test_driver_id)
                .values(is_available=True)
            )
            print(f"Test driver {test_driver_id} is now ONLINE.")
        else:
            print(f"Warning: Test driver with email {TEST_DRIVER_EMAIL} not found!")

        await db.commit()
        print("Done!")


if __name__ == "__main__":
    asyncio.run(reset_driver_status())
