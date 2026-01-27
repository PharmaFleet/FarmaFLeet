import asyncio
from app.db.session import SessionLocal
from app.models.user import User
from app.models.driver import Driver
from app.models.order import Order
from sqlalchemy import delete, select


async def cleanup():
    async with SessionLocal() as db:
        print("Cleaning up ALL order and driver data for a fresh start...")

        # 1. Delete all orders (contain foreign keys to drivers)
        await db.execute(delete(Order))
        print("Deleted all orders.")

        # 2. Get all driver user IDs
        stmt = select(User.id).where(User.role == "driver")
        res = await db.execute(stmt)
        user_ids = res.scalars().all()

        if user_ids:
            # 3. Delete driver profiles
            await db.execute(delete(Driver).where(Driver.user_id.in_(user_ids)))
            # 4. Delete users
            await db.execute(delete(User).where(User.id.in_(user_ids)))
            print(f"Deleted {len(user_ids)} old drivers/users.")

        await db.commit()
        print("Cleanup successful.")


if __name__ == "__main__":
    asyncio.run(cleanup())
