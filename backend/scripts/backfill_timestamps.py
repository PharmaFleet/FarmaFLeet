"""
Backfill assigned_at and picked_up_at from OrderStatusHistory.
Backfill Driver.code as DRV-{id:03d}.

Usage:
    cd backend
    # Set DATABASE_URL env var first
    python scripts/backfill_timestamps.py
"""

import asyncio
import os
import sys

# Add parent dir to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.order import Order, OrderStatus, OrderStatusHistory
from app.models.driver import Driver


async def backfill():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is required")
        sys.exit(1)

    # Convert postgres:// to postgresql+asyncpg://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Backfill assigned_at from history
        print("Backfilling assigned_at...")
        result = await db.execute(
            select(Order).where(Order.assigned_at.is_(None), Order.driver_id.is_not(None))
        )
        orders = result.scalars().all()

        for order in orders:
            hist_result = await db.execute(
                select(OrderStatusHistory)
                .where(
                    OrderStatusHistory.order_id == order.id,
                    OrderStatusHistory.status == OrderStatus.ASSIGNED,
                )
                .order_by(OrderStatusHistory.timestamp.desc())
                .limit(1)
            )
            history = hist_result.scalars().first()
            if history:
                order.assigned_at = history.timestamp
                db.add(order)

        print(f"  Updated {len(orders)} orders with assigned_at")

        # Backfill picked_up_at from history
        print("Backfilling picked_up_at...")
        result = await db.execute(
            select(Order).where(
                Order.picked_up_at.is_(None),
                Order.status.in_([
                    OrderStatus.PICKED_UP,
                    OrderStatus.IN_TRANSIT,
                    OrderStatus.OUT_FOR_DELIVERY,
                    OrderStatus.DELIVERED,
                ]),
            )
        )
        orders = result.scalars().all()

        for order in orders:
            hist_result = await db.execute(
                select(OrderStatusHistory)
                .where(
                    OrderStatusHistory.order_id == order.id,
                    OrderStatusHistory.status == OrderStatus.PICKED_UP,
                )
                .order_by(OrderStatusHistory.timestamp.desc())
                .limit(1)
            )
            history = hist_result.scalars().first()
            if history:
                order.picked_up_at = history.timestamp
                db.add(order)

        print(f"  Updated {len(orders)} orders with picked_up_at")

        # Backfill Driver.code from biometric_id
        print("Backfilling Driver.code from biometric_id...")
        result = await db.execute(select(Driver).where(Driver.code.is_(None)))
        drivers = result.scalars().all()

        for driver in drivers:
            driver.code = driver.biometric_id or f"DRV-{driver.id:03d}"
            db.add(driver)

        print(f"  Updated {len(drivers)} drivers with code")

        await db.commit()
        print("Backfill complete.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(backfill())
