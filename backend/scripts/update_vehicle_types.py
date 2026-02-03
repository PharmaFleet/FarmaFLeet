"""
Update driver vehicle types from Excel file.

Reads the "Vehichle" column from the Drivers sheet and updates existing drivers
based on matching biometric_id.

Vehicle types:
- 🚗 = car
- 🏍️ = motorcycle

Run: python scripts/update_vehicle_types.py
"""

import asyncio
import sys
import os

sys.path.insert(0, ".")

import pandas as pd
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.db.base import Driver


# Excel file path (relative to backend directory)
EXCEL_FILE = "../../area kuwait 2026.xlsx"


def get_vehicle_type(emoji: str) -> str:
    """Convert emoji to vehicle type string."""
    if not emoji or pd.isna(emoji):
        return "car"  # Default to car

    emoji_str = str(emoji).strip()

    # Check for motorcycle emoji (various representations)
    if "🏍" in emoji_str or "motorcycle" in emoji_str.lower():
        return "motorcycle"

    # Default to car
    return "car"


async def update_vehicle_types():
    """Update vehicle types for existing drivers."""
    print("=" * 60)
    print("Update Driver Vehicle Types")
    print("=" * 60)

    # Read Excel file
    excel_path = os.path.join(os.path.dirname(__file__), EXCEL_FILE)
    if not os.path.exists(excel_path):
        # Try from current directory
        excel_path = "area kuwait 2026.xlsx"
        if not os.path.exists(excel_path):
            print(f"ERROR: Excel file not found at {EXCEL_FILE}")
            return

    print(f"\nReading {excel_path}...")

    # Read Drivers sheet
    try:
        drivers_df = pd.read_excel(excel_path, sheet_name="Drivers")
    except Exception as e:
        print(f"ERROR: Could not read Drivers sheet: {e}")
        return

    print(f"  - Found {len(drivers_df)} rows in Drivers sheet")

    # Check columns
    print(f"  - Columns: {list(drivers_df.columns)}")

    # Find the vehicle column (might be "Vehichle" with typo or "Vehicle")
    vehicle_col = None
    for col in drivers_df.columns:
        if "vehic" in col.lower():
            vehicle_col = col
            break

    if not vehicle_col:
        print("ERROR: Could not find vehicle column in Excel")
        return

    print(f"  - Using vehicle column: {vehicle_col}")

    # Find biometric column
    biometric_col = None
    for col in drivers_df.columns:
        if "biometric" in col.lower():
            biometric_col = col
            break

    if not biometric_col:
        print("ERROR: Could not find biometric column in Excel")
        return

    print(f"  - Using biometric column: {biometric_col}")

    # Connect to database
    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    print(f"\nConnecting to database...")
    engine = create_async_engine(db_url, echo=False)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        updated = 0
        not_found = 0

        for _, row in drivers_df.iterrows():
            biometric_id = str(row[biometric_col]).strip()
            vehicle_emoji = row.get(vehicle_col)
            vehicle_type = get_vehicle_type(vehicle_emoji)

            # Find driver by biometric_id
            result = await session.execute(
                select(Driver).where(Driver.biometric_id == biometric_id)
            )
            driver = result.scalars().first()

            if driver:
                if driver.vehicle_type != vehicle_type:
                    driver.vehicle_type = vehicle_type
                    updated += 1
                    print(f"  [UPDATED] {biometric_id}: {vehicle_type}")
            else:
                not_found += 1

        await session.commit()

        print(f"\n{updated} drivers updated, {not_found} not found in database")

    await engine.dispose()
    print("\nDone!")


if __name__ == "__main__":
    import traceback

    try:
        asyncio.run(update_vehicle_types())
    except Exception:
        traceback.print_exc()
        sys.exit(1)
