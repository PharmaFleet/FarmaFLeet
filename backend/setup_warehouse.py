import asyncio
from app.db.session import SessionLocal
from app.models.warehouse import Warehouse
from sqlalchemy import select


async def setup():
    async with SessionLocal() as db:
        # Check if any warehouse exists
        stmt = select(Warehouse)
        res = await db.execute(stmt)
        wh = res.scalars().first()

        if not wh:
            print("No warehouse found. Creating 'Main Warehouse'...")
            from geoalchemy2.elements import WKTElement

            # Location: Sabah Al Ahmad (approx)
            location = WKTElement("POINT(48.077 28.775)", srid=4326)

            wh = Warehouse(
                name="Main Warehouse",
                code="WH01",
                # address="Sabah Al Ahmed", # Removed invalid field
                location=location,
                # is_active=True, # Removed invalid field
            )
            db.add(wh)
            await db.commit()
            await db.refresh(wh)
            print(f"Created Warehouse ID: {wh.id}")
        else:
            print(f"Existing Warehouse found: {wh.name} (ID: {wh.id})")


if __name__ == "__main__":
    asyncio.run(setup())
