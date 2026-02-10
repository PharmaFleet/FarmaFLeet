import asyncio
import os
import sys

# Set path to include backend
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import SessionLocal
from app.models.warehouse import Warehouse
from app.services.excel import excel_service
import app.db.base  # Load all models
from sqlalchemy import select
from geoalchemy2 import WKTElement

EXCEL_FILE = "../Pharmacy Codes.xlsx"


async def seed_warehouses():
    print(f"Reading {EXCEL_FILE}...")
    data = []
    try:
        if os.path.exists(EXCEL_FILE):
            data = excel_service.read_local_file(EXCEL_FILE)
    except Exception as e:
        print(f"Error reading file: {e}")

    if data:
        print(f"Found {len(data)} rows. Columns: {list(data[0].keys())}")

    # Try to map columns
    # Expected: Code, Name, Lat, Long (or similar)
    # Adjust based on actual columns found in print output if needed.
    # For now, I will guess standard names or look for keywords.

    # Columns: ['#', 'Pharmacy', 'Code ', 'Company ']
    first_row = data[0]
    col_code = "Code "
    col_name = "Pharmacy"

    # Check if columns exist
    if col_code not in first_row or col_name not in first_row:
        print(f"Columns not found. Available: {list(first_row.keys())}")
        return

    col_lat = None
    col_long = None

    async with SessionLocal() as session:
        count = 0
        for row in data:
            code = str(row[col_code]).strip()
            name = str(row[col_name]).strip()

            # Check exist
            result = await session.execute(
                select(Warehouse).where(Warehouse.code == code)
            )
            existing = result.scalars().first()

            if not existing:
                # Handle location if lat/long present
                location = None
                if col_lat and col_long and row[col_lat] and row[col_long]:
                    try:
                        lat = float(row[col_lat])
                        lon = float(row[col_long])
                        # Create WKT point
                        location = WKTElement(f"POINT({lon} {lat})", srid=4326)
                    except:
                        pass

                warehouse = Warehouse(code=code, name=name, location=location)
                session.add(warehouse)
                count += 1

        await session.commit()
        await session.commit()
        print(f"Seeded {count} new warehouses.")

    if not data and not os.path.exists(EXCEL_FILE):
        # Fallback manual seed
        print("Excel file not found. Seeding default warehouse...")
        async with SessionLocal() as session:
            result = await session.execute(
                select(Warehouse).where(Warehouse.code == "WH001")
            )
            if not result.scalars().first():
                w = Warehouse(
                    code="WH001",
                    name="Main Warehouse",
                    location=WKTElement("POINT(47.9774 29.3759)", srid=4326),  # Lon Lat
                )
                session.add(w)
                await session.commit()
                print("Default WH001 created.")
            else:
                print("Default WH001 already exists.")


if __name__ == "__main__":
    asyncio.run(seed_warehouses())
