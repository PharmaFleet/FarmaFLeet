import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

# from app.db.session import SessionLocal # Avoid using shared session to ensure connect_args are applied
from sqlalchemy import select, text
from app.models.user import User
from app.models.driver import Driver
from app.core.security import get_password_hash

# Direct connection string to ensure we hit the transaction pooler with correct settings
DATABASE_URL = "postgresql+asyncpg://postgres.ubmgphjlpjovebkuthrf:Pharmafleet0101@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"


async def create_test_driver():
    # Create dedicated engine with statement_cache_size=0 for PgBouncer
    engine = create_async_engine(
        DATABASE_URL, connect_args={"statement_cache_size": 0}, poolclass=NullPool
    )
    SessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

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
