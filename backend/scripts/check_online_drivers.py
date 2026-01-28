import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy import select
from app.db.base import Driver, User
from app.core.config import settings


async def check_online_drivers():
    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("Checking ONLINE drivers (is_available=True)...")
        # specific query to get driver with user and location info if possible
        # Note: Driver model might not have direct location column if it's in a separate table,
        # checking app/models/driver.py would be good, but assuming standard fields first.
        # Based on previous file views, Warehouse has lat/long.

        query = (
            select(Driver)
            .where(Driver.is_available == True)
            .options(selectinload(Driver.user), selectinload(Driver.warehouse))
        )
        result = await db.execute(query)
        drivers = result.scalars().all()

        print(f"Found {len(drivers)} online drivers:")
        for d in drivers:
            user_email = d.user.email if d.user else "No User"
            user_name = d.user.full_name if d.user else "Unknown"
            warehouse_name = d.warehouse.name if d.warehouse else "No Warehouse"
            lat = d.warehouse.latitude if d.warehouse else "None"
            lng = d.warehouse.longitude if d.warehouse else "None"

            print(f"Driver ID: {d.id} | Name: {user_name} | Email: {user_email}")
            print(f"  - Warehouse: {warehouse_name} (Lat: {lat}, Lng: {lng})")
            print(f"  - Vehicle: {d.vehicle_info}")
            print("-" * 40)


if __name__ == "__main__":
    asyncio.run(check_online_drivers())
