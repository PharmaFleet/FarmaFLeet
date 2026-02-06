import asyncio
import pandas as pd
from app.db.session import SessionLocal
from app.models.user import User
from app.models.driver import Driver
from app.models.warehouse import Warehouse
from app.core.security import get_password_hash
from sqlalchemy import select, delete, text
from geoalchemy2.elements import WKTElement

DRIVERS_EXCEL = "e:/Py/Delivery-System-III/area kuwait 2026.xlsx"
PHARMACY_EXCEL = "e:/Py/Delivery-System-III/Pharmacy Codes.xlsx"


async def seed():
    async with SessionLocal() as db:
        print("Starting Nuclear Cleanup of Warehouses and Drivers...")
        # Deep cleanup to prevent ID conflicts or stale data
        await db.execute(
            text("TRUNCATE TABLE driver, warehouse RESTART IDENTITY CASCADE;")
        )
        await db.execute(delete(User).where(User.role == "driver"))
        await db.commit()

        async with SessionLocal() as db:  # New session after truncation
            print(f"Reading Pharmacies from {PHARMACY_EXCEL}...")
            ph_df = pd.read_excel(PHARMACY_EXCEL)

            warehouse_map = {}  # Name -> ID

            # Default coordinates for regions (fallback)
            region_coords = {
                "Sabah Al Ahmed": "POINT(48.15 28.62)",
                "Egaila": "POINT(48.08 29.17)",
                "Sabah Al Salem": "POINT(48.07 29.25)",
                "Salmiya": "POINT(48.08 29.33)",
                "Khaitan": "POINT(47.98 29.28)",
                "Qortuba": "POINT(47.99 29.31)",
            }

            print("Seeding Pharmacies as Warehouses...")
            for _, row in ph_df.iterrows():
                ph_name = str(row["Pharmacy"]).strip()
                ph_code = str(row.get("Code ", row.get("Code", "UNKNOWN"))).strip()

                if not ph_name or ph_name == "nan":
                    continue

                # Check if code already exists (duplicates in Excel?)
                stmt = select(Warehouse).where(Warehouse.code == ph_code)
                res = await db.execute(stmt)
                if res.scalars().first():
                    # print(f"Skipping duplicate code: {ph_code}")
                    continue

                # Try to guess location for coordinates if name contains a known region
                location_wkt = "POINT(47.97 29.37)"  # Default Kuwait City
                for region, coord in region_coords.items():
                    if region.lower() in ph_name.lower():
                        location_wkt = coord
                        break

                wh = Warehouse(
                    name=ph_name,
                    code=ph_code,
                    location=WKTElement(location_wkt, srid=4326),
                )
                db.add(wh)
                await db.flush()
                warehouse_map[ph_name.lower()] = wh.id

            print(f"Reading Drivers from {DRIVERS_EXCEL}...")
            dr_df = pd.read_excel(DRIVERS_EXCEL, sheet_name="Drivers")

            count = 0
            hub_count = 0
            for _, row in dr_df.iterrows():
                name = str(row["Name"]).strip()
                bio = str(row["Biometric"]).strip()
                code = str(row["Phinex Code"]).strip()
                loc = str(row["Location"]).strip()

                if not name or name == "nan" or name == "Name":
                    continue

                email = f"{name.lower().replace(' ', '.')}@pharmafleet.com"

                # Determine Warehouse ID
                # 1. Try to find a pharmacy that matches the location
                wh_id = None
                for ph_name_lower, ph_id in warehouse_map.items():
                    if loc.lower() in ph_name_lower:
                        wh_id = ph_id
                        break

                if not wh_id:
                    if loc.lower() in warehouse_map:
                        wh_id = warehouse_map[loc.lower()]
                    else:
                        # Create a "Regional Hub" warehouse if it doesn't exist
                        print(f"Creating Regional Hub: {loc}")
                        hub_count += 1
                        # Generate unique HUB code
                        hub_code = f"HUB-{loc[:3].upper()}{hub_count}"
                        wh = Warehouse(
                            name=loc,
                            code=hub_code,
                            location=WKTElement(
                                region_coords.get(loc, "POINT(47.97 29.37)"), srid=4326
                            ),
                        )
                        db.add(wh)
                        await db.flush()
                        wh_id = wh.id
                        warehouse_map[loc.lower()] = wh_id

                # Create User
                user = User(
                    email=email,
                    full_name=name,
                    hashed_password=get_password_hash("driver123"),
                    role="driver",
                    is_active=True,
                )
                db.add(user)
                await db.flush()

                # Create Driver
                driver = Driver(
                    user_id=user.id,
                    vehicle_info=f"PHX-{code}" if code != "nan" else "Generic PHX",
                    biometric_id=bio if bio != "nan" else None,
                    code=code if code != "nan" else (bio if bio != "nan" else None),
                    warehouse_id=wh_id,
                    is_available=True,
                )
                db.add(driver)
                count += 1

            await db.commit()
            print(
                f"Sync complete. Created {count} drivers and synced with pharmacies/hubs."
            )


if __name__ == "__main__":
    asyncio.run(seed())
