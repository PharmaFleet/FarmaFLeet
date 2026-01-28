import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from geoalchemy2.elements import WKTElement
from app.db.base import Driver, User, Warehouse
from app.core.config import settings

GHOST_DRIVER_EMAIL = "driver@pharmafleet.com"


async def fix_driver_data():
    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("1. Setting ghost driver to OFFLINE...")
        # Find the ghost driver user
        result = await db.execute(select(User).where(User.email == GHOST_DRIVER_EMAIL))
        ghost_user = result.scalars().first()

        if ghost_user:
            print(f"   Found ghost user: {ghost_user.email} (ID: {ghost_user.id})")
            await db.execute(
                update(Driver)
                .where(Driver.user_id == ghost_user.id)
                .values(is_available=False)
            )
            print("   Ghost driver set to OFFLINE.")
        else:
            print("   Ghost driver not found (already fixed?).")

        print("\n2. Updating Warehouse Coordinates to Kuwait City...")
        # Update all warehouses to Kuwait City center for testing
        # Kuwait City: 29.3759 (Lat), 47.9774 (Lng) -> POINT(Lng Lat)
        # Note: PostGIS Uses (Lng, Lat) order for POINT
        kuwait_point = WKTElement("POINT(47.9774 29.3759)", srid=4326)

        await db.execute(update(Warehouse).values(location=kuwait_point))
        print("   All Warehouses updated to Default Kuwait Location.")

        await db.commit()
        print("\nDone!")


if __name__ == "__main__":
    asyncio.run(fix_driver_data())
