import asyncio
import sys
import random
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, ".")

from app.db.base import Order, User, Driver, Warehouse, OrderStatus
from app.models.user import UserRole

DRIVER_EMAIL = "driver@pharmafleet.com"


async def seed_orders():
    print("Seeding orders...")
    db_url = "postgresql+asyncpg://postgres:postgres@localhost:5444/pharmafleet"
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. Get Driver
        result = await session.execute(
            select(Driver).join(User).where(User.email == DRIVER_EMAIL)
        )
        driver = result.scalars().first()

        if not driver:
            print(f"Driver {DRIVER_EMAIL} not found. Run seed_test_driver.py first.")
            return

        print(f"Found driver ID: {driver.id}")

        # 2. Get Warehouse
        if driver.warehouse_id:
            warehouse = await session.get(Warehouse, driver.warehouse_id)
        else:
            result = await session.execute(select(Warehouse))
            warehouse = result.scalars().first()

        if not warehouse:
            print("No warehouse found.")
            return

        print(f"Using Warehouse: {warehouse.name} ({warehouse.id})")

        # 3. Create active orders assigned to driver
        active_orders = [
            {
                "customer": {
                    "name": "Alice Pharmacy",
                    "phone": "12345678",
                    "address": "Block 1, Street 25",
                    "area": "Salmiya",
                },
                "amount": 150.500,
                "status": OrderStatus.ASSIGNED,
                "number": "ORD-2024-001",
            },
            {
                "customer": {
                    "name": "Bob Clinic",
                    "phone": "87654321",
                    "address": "Building 5, Floor 2",
                    "area": "Hawally",
                },
                "amount": 42.750,
                "status": OrderStatus.PICKED_UP,
                "number": "ORD-2024-002",
            },
        ]

        for data in active_orders:
            # Check if exists
            exists = await session.execute(
                select(Order).where(Order.sales_order_number == data["number"])
            )
            if exists.scalars().first():
                continue

            order = Order(
                sales_order_number=data["number"],
                customer_info=data["customer"],
                total_amount=data["amount"],
                payment_method="CASH",
                warehouse_id=warehouse.id,
                status=data["status"],
                driver_id=driver.id,
            )
            session.add(order)
            print(f"Created active order {data['number']}")

        # 4. Create completed orders
        completed_orders = [
            {
                "customer": {
                    "name": "City Hospital",
                    "phone": "99999999",
                    "address": "Main Road",
                    "area": "Kuwait City",
                },
                "amount": 500.000,
                "status": OrderStatus.DELIVERED,
                "number": "ORD-2024-003",
            }
        ]

        for data in completed_orders:
            # Check if exists
            exists = await session.execute(
                select(Order).where(Order.sales_order_number == data["number"])
            )
            if exists.scalars().first():
                continue

            order = Order(
                sales_order_number=data["number"],
                customer_info=data["customer"],
                total_amount=data["amount"],
                payment_method="CHEQUE",
                warehouse_id=warehouse.id,
                status=data["status"],
                driver_id=driver.id,
            )
            session.add(order)
            print(f"Created completed order {data['number']}")

        await session.commit()
        print("Orders seeded successfully.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_orders())
