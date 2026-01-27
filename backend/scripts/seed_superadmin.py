"""
Seed script to create initial superadmin user.
Run: python scripts/seed_superadmin.py
"""

import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_password_hash

# Import all models to ensure relationships are resolved correctly
from app.db.base import (
    Base,
    User,
    Driver,
    Warehouse,
    Order,
    OrderStatusHistory,
    ProofOfDelivery,
    Notification,
    DriverLocation,
    PaymentCollection,
)
from app.models.user import UserRole


# Default superadmin credentials
SUPERADMIN_EMAIL = "admin@pharmafleet.com"
SUPERADMIN_PASSWORD = "admin123"  # Change this in production!
SUPERADMIN_NAME = "System Administrator"


async def create_superadmin():
    """Create the superadmin user if it doesn't exist."""
    print("Starting superadmin seeding...")
    # Create engine from settings
    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    print(f"Connecting to database...")
    engine = create_async_engine(db_url, echo=True)

    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if superadmin already exists
        result = await session.execute(
            select(User).where(User.email == SUPERADMIN_EMAIL)
        )
        existing_user = result.scalars().first()

        if existing_user:
            print(f"Superadmin already exists: {SUPERADMIN_EMAIL}")
            return

        # Create superadmin
        superadmin = User(
            full_name=SUPERADMIN_NAME,
            email=SUPERADMIN_EMAIL,
            hashed_password=get_password_hash(SUPERADMIN_PASSWORD),
            is_active=True,
            is_superuser=True,
            role=UserRole.SUPER_ADMIN,
        )

        session.add(superadmin)
        await session.commit()

        print(f"Superadmin created successfully!")
        print(f"   Email: {SUPERADMIN_EMAIL}")
        print(f"   Password: {SUPERADMIN_PASSWORD}")
        print(f"   Change the password in production!")

    await engine.dispose()


if __name__ == "__main__":
    import traceback

    try:
        asyncio.run(create_superadmin())
    except Exception:
        traceback.print_exc()
        sys.exit(1)
