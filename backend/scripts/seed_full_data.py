import asyncio
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.driver import Driver
from app.models.warehouse import Warehouse
from app.models.order import Order, OrderStatus
from app.models.financial import PaymentCollection, PaymentMethod
from app.core.security import get_password_hash

# Data Constants
WAREHOUSES = [
    {"name": "Al Rai Pharma", "code": "W001", "lat": 29.3, "lon": 47.9},
    {"name": "Salmiya Hub", "code": "W002", "lat": 29.33, "lon": 48.0},
    {"name": "Main City Warehouse", "code": "W003", "lat": 29.37, "lon": 47.97},
]

DRIVER_NAMES = [
    "Ahmed Al-Sabah",
    "Mohamed Ali",
    "Rajesh Kumar",
    "John Smith",
    "Fahad Al-Otaibi",
    "Saeed Al-Zahrani",
    "Omar Farooq",
    "Peter Jones",
    "Ali Hassan",
    "Khaled Yassin",
]
VEHICLES = ["Toyota HiAce", "Nissan Urvan", "Honda Motorcycle", "Isuzu Truck"]

ORDER_STATUSES = [
    OrderStatus.PENDING,
    OrderStatus.ASSIGNED,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
]
PAYMENT_METHODS = [PaymentMethod.CASH, PaymentMethod.KNET, PaymentMethod.CREDIT_CARD]


async def seed_data():
    async with SessionLocal() as db:
        print("--- Seeding Data ---")

        # 1. Ensure Warehouses
        ids_wh = []
        for wh_data in WAREHOUSES:
            res = await db.execute(
                select(Warehouse).where(Warehouse.code == wh_data["code"])
            )
            wh = res.scalars().first()
            if not wh:
                wh = Warehouse(
                    name=wh_data["name"],
                    code=wh_data["code"],
                    latitude=wh_data["lat"],
                    longitude=wh_data["lon"],
                )
                db.add(wh)
                await db.commit()
                await db.refresh(wh)
                print(f"Created Warehouse: {wh.name}")
            ids_wh.append(wh.id)

        # 2. Ensure Drivers
        ids_drivers = []
        for i, name in enumerate(DRIVER_NAMES):
            email = f"driver{i + 1}@example.com"
            # User
            res = await db.execute(select(User).where(User.email == email))
            user = res.scalars().first()
            if not user:
                user = User(
                    email=email,
                    hashed_password=get_password_hash("password"),
                    full_name=name,
                    role=UserRole.DRIVER,
                    is_active=True,
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)

            # Driver Profile
            res_d = await db.execute(select(Driver).where(Driver.user_id == user.id))
            driver = res_d.scalars().first()
            if not driver:
                driver = Driver(
                    user_id=user.id,
                    warehouse_id=random.choice(ids_wh),
                    vehicle_info=f"{random.choice(VEHICLES)} - KW {random.randint(1000, 9999)}",
                    biometric_id=f"BIO-{random.randint(10000, 99999)}",
                    is_available=random.choice([True, False]),
                )
                db.add(driver)
                await db.commit()
                await db.refresh(driver)
                print(f"Created Driver: {name}")
            ids_drivers.append(driver.id)

        # 3. Create Orders
        for i in range(20):
            so_num = f"SO-{random.randint(10000, 99999)}"
            res_o = await db.execute(
                select(Order).where(Order.sales_order_number == so_num)
            )
            if not res_o.scalars().first():
                status = random.choice(ORDER_STATUSES)
                wh_id = random.choice(ids_wh)

                # Logic: If status is past PENDING, assign driver
                drv_id = None
                if status != OrderStatus.PENDING and status != OrderStatus.CANCELLED:
                    drv_id = random.choice(ids_drivers)

                order = Order(
                    sales_order_number=so_num,
                    customer_info={
                        "name": f"Customer {i + 1}",
                        "phone": f"9999{i:04d}",
                        "address": f"Block {random.randint(1, 12)}, Street {random.randint(1, 50)}",
                        "area": "Salmiya",
                    },
                    total_amount=round(random.uniform(10.0, 150.0), 3),
                    payment_method=random.choice(["CASH", "KNET"]),
                    warehouse_id=wh_id,
                    driver_id=drv_id,
                    status=status,
                    created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 5)),
                )
                db.add(order)
                await db.commit()
                await db.refresh(order)

                # 4. Create Payment if Delivered
                if status == OrderStatus.DELIVERED and drv_id:
                    # Force some to be pending (verified_at = None) for testing
                    is_verified = i % 2 == 0  # Every second one is verified
                    pmt = PaymentCollection(
                        order_id=order.id,
                        driver_id=drv_id,
                        amount=order.total_amount,
                        method=random.choice(PAYMENT_METHODS),
                        transaction_id=f"TXN-{random.randint(100000, 999999)}"
                        if random.choice([True, False])
                        else None,
                        verified_at=datetime.now(timezone.utc) if is_verified else None,
                        verified_by_id=1
                        if is_verified
                        else None,  # Assuming admin id 1 exists
                    )
                    db.add(pmt)
                    await db.commit()

        print(
            f"✅ Seeding Complete. Created/Ensured 3 Warehouses, {len(ids_drivers)} Drivers, Orders/Payments."
        )


if __name__ == "__main__":
    asyncio.run(seed_data())
