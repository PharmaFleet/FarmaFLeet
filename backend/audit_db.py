import asyncio
from app.db.session import SessionLocal
from app.models.driver import Driver
from app.models.user import User
from app.models.warehouse import Warehouse
from sqlalchemy import select
from sqlalchemy.orm import selectinload


async def audit():
    async with SessionLocal() as db:
        # Check Warehouses
        wh_stmt = select(Warehouse)
        wh_res = await db.execute(wh_stmt)
        warehouses = wh_res.scalars().all()
        print(f"\n--- Warehouses ({len(warehouses)}) ---")
        for wh in warehouses:
            print(f"ID: {wh.id} | Code: {wh.code} | Name: {wh.name}")

        # Check Drivers
        dr_stmt = select(Driver).options(
            selectinload(Driver.user), selectinload(Driver.warehouse)
        )
        dr_res = await db.execute(dr_stmt)
        drivers = dr_res.scalars().all()
        print(f"\n--- Drivers ({len(drivers)}) ---")
        for dr in drivers[:15]:  # Show first 15
            user_name = dr.user.full_name if dr.user else "NO USER"
            user_email = dr.user.email if dr.user else "NO EMAIL"
            wh_name = (
                dr.warehouse.name if dr.warehouse else f"No WH (ID: {dr.warehouse_id})"
            )
            print(
                f"ID: {dr.id} | Name: {user_name} | Email: {user_email} | Vehicle: {dr.vehicle_info} | WH: {wh_name}"
            )

        if len(drivers) > 15:
            print(f"... and {len(drivers) - 15} more.")


if __name__ == "__main__":
    asyncio.run(audit())
