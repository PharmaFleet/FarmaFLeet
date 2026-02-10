import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.base import Base, User, Driver, Warehouse
from app.models.user import UserRole


# Default driver credentials
DRIVER_EMAIL = "driver@pharmafleet.com"
DRIVER_PASSWORD = "driver123"
DRIVER_NAME = "John Driver"
WAREHOUSE_CODE = (
    "P001"  # Assuming first warehouse from seed has this code or we pick first one
)


async def create_driver_user():
    """Create a driver user and profile."""
    print("Starting driver seeding...")
    # Create engine
    db_url = "postgresql+asyncpg://postgres:postgres@localhost:5444/pharmafleet"
    print(f"Connecting to {db_url}...")
    engine = create_async_engine(db_url, echo=True)

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if driver user already exists
        result = await session.execute(select(User).where(User.email == DRIVER_EMAIL))
        existing_user = result.scalars().first()

        user = existing_user
        if not user:
            print(f"Creating user {DRIVER_EMAIL}...")
            user = User(
                full_name=DRIVER_NAME,
                email=DRIVER_EMAIL,
                hashed_password=get_password_hash(DRIVER_PASSWORD),
                is_active=True,
                is_superuser=False,
                role=UserRole.DRIVER,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print("User created.")
        else:
            print(f"User {DRIVER_EMAIL} already exists.")

        # Check for driver profile
        result = await session.execute(select(Driver).where(Driver.user_id == user.id))
        driver_profile = result.scalars().first()

        if not driver_profile:
            print("Creating driver profile...")
            # Get a warehouse
            wh_result = await session.execute(select(Warehouse))
            warehouse = wh_result.scalars().first()

            warehouse_id = warehouse.id if warehouse else None

            driver_profile = Driver(
                user_id=user.id,
                warehouse_id=warehouse_id,
                vehicle_info="Toyota HiAce - KW 12345",
                biometric_id="bio_123_abc",
                is_available=True,
            )
            session.add(driver_profile)
            await session.commit()
            print("Driver profile created.")
        else:
            print("Driver profile already exists.")

        print("Driver Credentials:")
        print(f"  Email: {DRIVER_EMAIL}")
        print(f"  Password: {DRIVER_PASSWORD}")

    await engine.dispose()


if __name__ == "__main__":
    import traceback

    try:
        asyncio.run(create_driver_user())
    except Exception:
        traceback.print_exc()
        sys.exit(1)
