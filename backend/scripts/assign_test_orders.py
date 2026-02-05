import asyncio
import sys
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import os

# Add 'backend' directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import Order, User, Driver
from app.models.order import OrderStatus

# Test driver email
DRIVER_EMAIL = "testdriver@pharmafleet.com"


async def assign_test_orders():
    print(f"Connecting to database to assign orders to {DRIVER_EMAIL}...")

    # Connect
    db_url = "postgresql+asyncpg://postgres:postgres@localhost:5444/pharmafleet"
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. Find Driver
        result = await session.execute(
            select(Driver).join(User).where(User.email == DRIVER_EMAIL)
        )
        driver = result.scalars().first()

        if not driver:
            print(f"❌ Driver {DRIVER_EMAIL} not found!")
            print("Please run `backend/create_test_driver.py` first.")
            return

        print(f"✅ Found Driver ID: {driver.id}")

        # 2. Get Warehouse (from driver or default)
        warehouse_id = driver.warehouse_id or 1

        # 3. Create/Assign Orders
        # We will create fresh orders to ensure specific test cases

        test_orders = [
            {
                "number": "TEST-MOBILE-001",
                "customer": {
                    "name": "Test Pharmacy A",
                    "phone": "99991111",
                    "address": "Block 1, Street Test, House 1",
                    "area": "Salmiya",
                    "lat": 29.333,
                    "lng": 48.066,  # Approx Salmiya
                },
                "amount": 100.0,
                "status": OrderStatus.ASSIGNED,
                "note": "Assigned Order - Should appear in 'New' list",
            },
            {
                "number": "TEST-MOBILE-002",
                "customer": {
                    "name": "Test Clinic B",
                    "phone": "99992222",
                    "address": "Block 2, Street Test, House 2",
                    "area": "Hawally",
                    "lat": 29.340,
                    "lng": 48.030,  # Approx Hawally
                },
                "amount": 250.50,
                "status": OrderStatus.PICKED_UP,
                "note": "Picked Up Order - Should appear in 'In Progress' list",
            },
            {
                "number": "TEST-MOBILE-003",
                "customer": {
                    "name": "Test Hospital C",
                    "phone": "99993333",
                    "address": "Block 3, Street Test, House 3",
                    "area": "Kuwait City",
                    "lat": 29.375,
                    "lng": 47.977,  # Approx Kuwait City
                },
                "amount": 500.0,
                "status": OrderStatus.DELIVERED,
                "note": "Delivered Order - Should match filtering logic (if any)",
            },
        ]

        assigned_count = 0

        for data in test_orders:
            # Check if order exists
            exists = await session.execute(
                select(Order).where(Order.sales_order_number == data["number"])
            )
            existing_order = exists.scalars().first()

            if existing_order:
                # Update existing order to belong to this driver
                existing_order.driver_id = driver.id
                existing_order.status = data["status"]
                existing_order.updated_at = datetime.now(timezone.utc)
                session.add(existing_order)
                print(f"Updated existing order {data['number']}")
            else:
                # Create new
                new_order = Order(
                    sales_order_number=data["number"],
                    customer_info=data["customer"],
                    total_amount=data["amount"],
                    payment_method="CASH",
                    warehouse_id=warehouse_id,
                    status=data["status"],
                    driver_id=driver.id,
                    created_at=datetime.now(timezone.utc),
                )
                session.add(new_order)
                print(f"Created new order {data['number']}")

            assigned_count += 1

        await session.commit()
        print(f"\n✅ Successfully assigned {assigned_count} orders to {DRIVER_EMAIL}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(assign_test_orders())
