import asyncio
from app.db.session import SessionLocal
from app.models.user import User
from app.models.driver import Driver
from app.models.order import Order, OrderStatusHistory, ProofOfDelivery
from app.models.financial import PaymentCollection
from app.models.warehouse import Warehouse
from app.models.location import DriverLocation
from sqlalchemy import delete, select, text


async def nuclear_cleanup():
    async with SessionLocal() as db:
        print("Starting Deep Nuclear Cleanup...")

        # Disable FK checks for easier cleanup if supported, but let's be careful and do it in order
        # Specifically for Postgres:
        await db.execute(
            text(
                'TRUNCATE TABLE paymentcollection, orderstatushistory, proofofdelivery, "order", driverlocation, driver RESTART IDENTITY CASCADE;'
            )
        )
        print("Truncated all fleet-related tables.")

        # Now delete users with role 'driver'
        await db.execute(delete(User).where(User.role == "driver"))
        print("Deleted all driver accounts.")

        # Clean up warehouses
        await db.execute(text("TRUNCATE TABLE warehouse RESTART IDENTITY CASCADE;"))
        print("Truncated warehouses.")

        await db.commit()
        print("Nuclear Cleanup Successful.")


if __name__ == "__main__":
    asyncio.run(nuclear_cleanup())
