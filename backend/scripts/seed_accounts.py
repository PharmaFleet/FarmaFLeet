"""
Seed script to create users from accounts.xlsx
- 102 drivers with biometric ID, name, phone, and warehouse assignment
- 14 warehouses/pharmacies
- 14 warehouse manager accounts
- 2 admin accounts (IT and Admin)

Run: python scripts/seed_accounts.py
"""

import asyncio
import sys
import os
import re

sys.path.insert(0, ".")

import pandas as pd
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from geoalchemy2 import WKTElement

from app.core.config import settings
from app.core.security import get_password_hash

# Import all models
from app.db.base import Base, User, Driver, Warehouse
from app.models.user import UserRole


# Default password for all seeded accounts
DEFAULT_PASSWORD = "pharmafleet2026"

# Excel file path (relative to backend directory)
EXCEL_FILE = "../../accounts.xlsx"

# Location to Warehouse mapping
LOCATION_TO_WAREHOUSE = {
    "Sabah Al Ahmed": "DW001",  # Al-Nowair Pharmacy
    "Egaila": "DW008",  # Al-Sultan Pharmacy
    "Sabah Al Salem": "DW006",  # Al-Bannai Pharmacy
    "Salmiya": "DW002",  # Al-Rabie Pharmacy
    "Khaitan": "DW004",  # Hamza Pharmacy
    "Qortuba": "BV001",  # Al-Biruni Pharmacy
}

# Warehouse data with coordinates (approximate locations in Kuwait)
WAREHOUSE_COORDINATES = {
    "DW001": (29.1347, 47.8478),  # Sabah Al Ahmed area
    "DW002": (29.3348, 48.0794),  # Salmiya area
    "DW004": (29.2959, 47.9691),  # Khaitan area
    "DW005": (29.3500, 47.9800),  # Al-Madina (central Kuwait)
    "DW006": (29.2500, 48.0500),  # Sabah Al Salem area
    "DW007": (29.3200, 48.0200),  # Heba (near Salmiya)
    "DW008": (29.0886, 48.0932),  # Egaila area
    "DW009": (29.3400, 48.0000),  # Al Motatawra
    "DW010": (29.3600, 47.9500),  # Call Center Mays
    "BV001": (29.3544, 47.9397),  # Qortuba area
    "BV002": (29.3100, 47.9700),  # Mays Pharmacy
    "BV003": (29.2800, 48.0100),  # Sondos Pharmacy
    "BV004": (29.2200, 48.0600),  # Al-Masila
    "CCB01": (29.3300, 47.9600),  # Call Center Biovet
}


def generate_driver_email(full_name: str) -> str:
    """
    Generate email from driver name.

    Rules:
    - 3+ names: first initial + middle initial + last name
    - 2 names: first initial + last name
    - 1 name: use as is
    """
    # Clean the name (remove tabs, newlines, extra spaces)
    cleaned_name = re.sub(r"[\t\n]+", "", full_name).strip()
    cleaned_name = re.sub(r"\s+", " ", cleaned_name)

    parts = cleaned_name.split()

    if len(parts) >= 3:
        # First initial + middle initial + last name
        email_prefix = parts[0][0].lower() + parts[1][0].lower() + parts[-1].lower()
    elif len(parts) == 2:
        # First initial + last name
        email_prefix = parts[0][0].lower() + parts[-1].lower()
    else:
        # Single name
        email_prefix = parts[0].lower() if parts else "unknown"

    # Remove any non-alphanumeric characters from email prefix
    email_prefix = re.sub(r"[^a-z0-9]", "", email_prefix)

    return f"{email_prefix}@pharmafleet.com"


def generate_manager_email(pharmacy_name: str) -> str:
    """
    Generate email from pharmacy name.
    Remove 'Pharmacy', 'Al-', 'AL-', spaces, and common words.
    """
    # Clean and lowercase
    name = pharmacy_name.lower().strip()

    # Remove common suffixes/prefixes
    name = re.sub(r"\s*pharmacy\s*", "", name)
    name = re.sub(r"^al-?\s*", "", name)
    name = re.sub(r"\s+", "", name)  # Remove spaces

    # Remove any special characters
    name = re.sub(r"[^a-z0-9]", "", name)

    return f"{name}@pharmafleet.com"


def clean_name(name: str) -> str:
    """Clean driver name by removing tabs, newlines, extra spaces."""
    if not name or pd.isna(name):
        return "Unknown"
    cleaned = re.sub(r"[\t\n]+", "", str(name)).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


async def seed_accounts():
    """Main seeding function."""
    print("=" * 60)
    print("PharmaFleet Account Seeding Script")
    print("=" * 60)

    # Read Excel file
    excel_path = os.path.join(os.path.dirname(__file__), EXCEL_FILE)
    if not os.path.exists(excel_path):
        # Try from current directory
        excel_path = "accounts.xlsx"
        if not os.path.exists(excel_path):
            print(f"ERROR: Excel file not found at {EXCEL_FILE} or accounts.xlsx")
            return

    print(f"\nReading {excel_path}...")

    # Read all sheets
    drivers_df = pd.read_excel(excel_path, sheet_name="Drivers")
    pharmacies_df = pd.read_excel(excel_path, sheet_name="Managers and Pharmacies")
    admins_df = pd.read_excel(excel_path, sheet_name="Admins")

    print(f"  - Drivers: {len(drivers_df)} rows")
    print(f"  - Pharmacies: {len(pharmacies_df)} rows")
    print(f"  - Admins: {len(admins_df)} rows")

    # Connect to database
    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    print(f"\nConnecting to database...")
    engine = create_async_engine(db_url, echo=False)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # =====================
        # 1. Seed Warehouses
        # =====================
        print("\n" + "-" * 40)
        print("Seeding Warehouses...")
        print("-" * 40)

        warehouse_id_map = {}  # code -> id
        warehouses_created = 0

        for _, row in pharmacies_df.iterrows():
            pharmacy_name = str(row["Pharmacy"]).strip()
            code = (
                str(row["Code "]).strip()
                if "Code " in row
                else str(row["Code"]).strip()
            )

            # Check if warehouse exists
            result = await session.execute(
                select(Warehouse).where(Warehouse.code == code)
            )
            existing = result.scalars().first()

            if existing:
                warehouse_id_map[code] = existing.id
                print(f"  [EXISTS] {code}: {pharmacy_name}")
            else:
                # Create warehouse with coordinates
                lat, lon = WAREHOUSE_COORDINATES.get(code, (29.3759, 47.9774))
                location = WKTElement(f"POINT({lon} {lat})", srid=4326)

                warehouse = Warehouse(code=code, name=pharmacy_name, location=location)
                session.add(warehouse)
                await session.flush()  # Get the ID
                warehouse_id_map[code] = warehouse.id
                warehouses_created += 1
                print(f"  [CREATED] {code}: {pharmacy_name}")

        await session.commit()
        print(
            f"\nWarehouses: {warehouses_created} created, {len(warehouse_id_map) - warehouses_created} existed"
        )

        # =====================
        # 2. Seed Admin Accounts
        # =====================
        print("\n" + "-" * 40)
        print("Seeding Admin Accounts...")
        print("-" * 40)

        admins_created = 0
        admin_data = [
            ("it@pharmafleet.com", "IT Administrator"),
            ("admin@pharmafleet.com", "System Administrator"),
        ]

        for email, full_name in admin_data:
            email_lower = email.lower()

            result = await session.execute(
                select(User).where(User.email == email_lower)
            )
            existing = result.scalars().first()

            if existing:
                print(f"  [EXISTS] {email_lower}")
            else:
                admin = User(
                    full_name=full_name,
                    email=email_lower,
                    hashed_password=get_password_hash(DEFAULT_PASSWORD),
                    is_active=True,
                    is_superuser=True,
                    role=UserRole.SUPER_ADMIN,
                )
                session.add(admin)
                admins_created += 1
                print(f"  [CREATED] {email_lower} - {full_name}")

        await session.commit()
        print(f"\nAdmins: {admins_created} created")

        # =====================
        # 3. Seed Manager Accounts
        # =====================
        print("\n" + "-" * 40)
        print("Seeding Warehouse Manager Accounts...")
        print("-" * 40)

        managers_created = 0

        for _, row in pharmacies_df.iterrows():
            pharmacy_name = str(row["Pharmacy"]).strip()
            code = (
                str(row["Code "]).strip()
                if "Code " in row
                else str(row["Code"]).strip()
            )
            email = generate_manager_email(pharmacy_name)

            result = await session.execute(select(User).where(User.email == email))
            existing = result.scalars().first()

            if existing:
                print(f"  [EXISTS] {email}")
            else:
                manager = User(
                    full_name=f"{pharmacy_name} Manager",
                    email=email,
                    hashed_password=get_password_hash(DEFAULT_PASSWORD),
                    is_active=True,
                    is_superuser=False,
                    role=UserRole.WAREHOUSE_MANAGER,
                )
                session.add(manager)
                managers_created += 1
                print(f"  [CREATED] {email} for {pharmacy_name}")

        await session.commit()
        print(f"\nManagers: {managers_created} created")

        # =====================
        # 4. Seed Drivers
        # =====================
        print("\n" + "-" * 40)
        print("Seeding Driver Accounts...")
        print("-" * 40)

        drivers_created = 0
        users_created = 0
        skipped_drivers = []

        for _, row in drivers_df.iterrows():
            biometric_id = str(row["Biometric"]).strip()
            full_name = clean_name(row["Name"])
            contact = str(row["Contact"]).strip() if pd.notna(row["Contact"]) else None
            location = (
                str(row["Location"]).strip() if pd.notna(row["Location"]) else None
            )

            # Generate email
            email = generate_driver_email(full_name)

            # Get warehouse code from location
            warehouse_code = LOCATION_TO_WAREHOUSE.get(location)
            warehouse_id = (
                warehouse_id_map.get(warehouse_code) if warehouse_code else None
            )

            if not warehouse_id:
                skipped_drivers.append((full_name, location, "No warehouse mapping"))
                continue

            # Check if user with this email exists
            result = await session.execute(select(User).where(User.email == email))
            existing_user = result.scalars().first()

            if existing_user:
                # Check if driver profile exists
                result = await session.execute(
                    select(Driver).where(Driver.user_id == existing_user.id)
                )
                existing_driver = result.scalars().first()

                if existing_driver:
                    print(f"  [EXISTS] {email} - {full_name}")
                    continue
                else:
                    # Create driver profile for existing user
                    driver = Driver(
                        user_id=existing_user.id,
                        warehouse_id=warehouse_id,
                        biometric_id=biometric_id,
                        is_available=False,
                    )
                    session.add(driver)
                    drivers_created += 1
                    print(f"  [DRIVER ONLY] {email} - {full_name}")
            else:
                # Create user and driver
                user = User(
                    full_name=full_name,
                    email=email,
                    phone=contact,
                    hashed_password=get_password_hash(DEFAULT_PASSWORD),
                    is_active=True,
                    is_superuser=False,
                    role=UserRole.DRIVER,
                )
                session.add(user)
                await session.flush()  # Get the user ID

                driver = Driver(
                    user_id=user.id,
                    warehouse_id=warehouse_id,
                    biometric_id=biometric_id,
                    is_available=False,
                )
                session.add(driver)

                users_created += 1
                drivers_created += 1
                print(
                    f"  [CREATED] {email} - {full_name} ({location} -> {warehouse_code})"
                )

        await session.commit()

        print(
            f"\nDrivers: {drivers_created} driver profiles created, {users_created} user accounts created"
        )

        if skipped_drivers:
            print(
                f"\nSkipped {len(skipped_drivers)} drivers due to missing warehouse mapping:"
            )
            for name, loc, reason in skipped_drivers:
                print(f"  - {name} (Location: {loc}) - {reason}")

    await engine.dispose()

    # =====================
    # Summary
    # =====================
    print("\n" + "=" * 60)
    print("SEEDING COMPLETE")
    print("=" * 60)
    print(f"  Warehouses: {warehouses_created} created")
    print(f"  Admins: {admins_created} created")
    print(f"  Managers: {managers_created} created")
    print(f"  Drivers: {drivers_created} created")
    print(f"\n  Default password for all accounts: {DEFAULT_PASSWORD}")
    print("=" * 60)


if __name__ == "__main__":
    import traceback

    try:
        asyncio.run(seed_accounts())
    except Exception:
        traceback.print_exc()
        sys.exit(1)
