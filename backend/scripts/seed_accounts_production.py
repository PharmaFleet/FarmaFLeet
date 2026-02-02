"""
Seed script for PRODUCTION Supabase database.
Uses synchronous psycopg2 to avoid PgBouncer prepared statement issues.
Run: python scripts/seed_accounts_production.py
"""

import sys
import os
import re

sys.path.insert(0, ".")

import pandas as pd
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session
from geoalchemy2 import WKTElement

from app.core.security import get_password_hash
from app.db.base import User, Driver, Warehouse
from app.models.user import UserRole

# Supabase production URL (synchronous psycopg2)
DB_URL = "postgresql://postgres.ubmgphjlpjovebkuthrf:Pharmafleet0101@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

DEFAULT_PASSWORD = "pharmafleet2026"
EXCEL_FILE = "../../accounts.xlsx"

# Warehouse data with coordinates (approximate locations in Kuwait)
WAREHOUSE_COORDINATES = {
    "DW001": (29.1347, 47.8478),   # Sabah Al Ahmed area
    "DW002": (29.3348, 48.0794),   # Salmiya area
    "DW004": (29.2959, 47.9691),   # Khaitan area
    "DW005": (29.3500, 47.9800),   # Al-Madina (central Kuwait)
    "DW006": (29.2500, 48.0500),   # Sabah Al Salem area
    "DW007": (29.3200, 48.0200),   # Heba (near Salmiya)
    "DW008": (29.0886, 48.0932),   # Egaila area
    "DW009": (29.3400, 48.0000),   # Al Motatawra
    "DW010": (29.3600, 47.9500),   # Call Center Mays
    "BV001": (29.3544, 47.9397),   # Qortuba area
    "BV002": (29.3100, 47.9700),   # Mays Pharmacy
    "BV003": (29.2800, 48.0100),   # Sondos Pharmacy
    "BV004": (29.2200, 48.0600),   # Al-Masila
    "CCB01": (29.3300, 47.9600),   # Call Center Biovet
}

LOCATION_TO_WAREHOUSE = {
    "Sabah Al Ahmed": "DW001",
    "Egaila": "DW008",
    "Sabah Al Salem": "DW006",
    "Salmiya": "DW002",
    "Khaitan": "DW004",
    "Qortuba": "BV001",
}


def generate_driver_email(full_name):
    cleaned_name = re.sub(r"[\t\n]+", "", full_name).strip()
    cleaned_name = re.sub(r"\s+", " ", cleaned_name)
    parts = cleaned_name.split()
    if len(parts) >= 3:
        email_prefix = parts[0][0].lower() + parts[1][0].lower() + parts[-1].lower()
    elif len(parts) == 2:
        email_prefix = parts[0][0].lower() + parts[-1].lower()
    else:
        email_prefix = parts[0].lower() if parts else "unknown"
    email_prefix = re.sub(r"[^a-z0-9]", "", email_prefix)
    return f"{email_prefix}@pharmafleet.com"


def generate_manager_email(pharmacy_name):
    name = pharmacy_name.lower().strip()
    name = re.sub(r"\s*pharmacy\s*", "", name)
    name = re.sub(r"^al-?\s*", "", name)
    name = re.sub(r"\s+", "", name)
    name = re.sub(r"[^a-z0-9]", "", name)
    return f"{name}@pharmafleet.com"


def clean_name(name):
    if not name or pd.isna(name):
        return "Unknown"
    cleaned = re.sub(r"[\t\n]+", "", str(name)).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def seed():
    print("=" * 60)
    print("PharmaFleet Production Seeding (Supabase)")
    print("=" * 60)

    # Read Excel
    excel_path = os.path.join(os.path.dirname(__file__), EXCEL_FILE)
    drivers_df = pd.read_excel(excel_path, sheet_name="Drivers")
    pharmacies_df = pd.read_excel(excel_path, sheet_name="Managers and Pharmacies")
    print(f"Drivers: {len(drivers_df)}, Pharmacies: {len(pharmacies_df)}")

    # Create synchronous engine
    engine = create_engine(DB_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as session:
        # Seed Warehouses first
        print("\n--- Seeding Warehouses ---")
        warehouse_id_map = {}
        warehouses_created = 0

        for _, row in pharmacies_df.iterrows():
            pharmacy_name = str(row["Pharmacy"]).strip()
            code = str(row["Code "]).strip() if "Code " in row else str(row["Code"]).strip()

            result = session.execute(select(Warehouse).where(Warehouse.code == code))
            existing = result.scalars().first()

            if existing:
                warehouse_id_map[code] = existing.id
                print(f"  [EXISTS] {code}: {pharmacy_name}")
            else:
                lat, lon = WAREHOUSE_COORDINATES.get(code, (29.3759, 47.9774))
                location = WKTElement(f"POINT({lon} {lat})", srid=4326)

                warehouse = Warehouse(code=code, name=pharmacy_name, location=location)
                session.add(warehouse)
                session.flush()
                warehouse_id_map[code] = warehouse.id
                warehouses_created += 1
                print(f"  [CREATED] {code}: {pharmacy_name}")

        session.commit()
        print(f"\nWarehouses: {warehouses_created} created, {len(warehouse_id_map)} total")

        # Seed Admins
        print("\n--- Seeding Admins ---")
        admin_data = [
            ("it@pharmafleet.com", "IT Administrator"),
            ("admin@pharmafleet.com", "System Administrator"),
        ]
        for email, full_name in admin_data:
            result = session.execute(
                select(User).where(User.email == email.lower())
            )
            if not result.scalars().first():
                admin = User(
                    full_name=full_name,
                    email=email.lower(),
                    hashed_password=get_password_hash(DEFAULT_PASSWORD),
                    is_active=True,
                    is_superuser=True,
                    role=UserRole.SUPER_ADMIN,
                )
                session.add(admin)
                print(f"  [CREATED] {email}")
            else:
                print(f"  [EXISTS] {email}")
        session.commit()

        # Seed Managers
        print("\n--- Seeding Managers ---")
        for _, row in pharmacies_df.iterrows():
            pharmacy_name = str(row["Pharmacy"]).strip()
            email = generate_manager_email(pharmacy_name)
            result = session.execute(select(User).where(User.email == email))
            if not result.scalars().first():
                manager = User(
                    full_name=f"{pharmacy_name} Manager",
                    email=email,
                    hashed_password=get_password_hash(DEFAULT_PASSWORD),
                    is_active=True,
                    is_superuser=False,
                    role=UserRole.WAREHOUSE_MANAGER,
                )
                session.add(manager)
                print(f"  [CREATED] {email}")
            else:
                print(f"  [EXISTS] {email}")
        session.commit()

        # Seed Drivers
        print("\n--- Seeding Drivers ---")
        drivers_created = 0
        for _, row in drivers_df.iterrows():
            biometric_id = str(row["Biometric"]).strip()
            full_name = clean_name(row["Name"])
            contact = str(row["Contact"]).strip() if pd.notna(row["Contact"]) else None
            location = (
                str(row["Location"]).strip() if pd.notna(row["Location"]) else None
            )

            email = generate_driver_email(full_name)
            warehouse_code = LOCATION_TO_WAREHOUSE.get(location)
            warehouse_id = warehouse_id_map.get(warehouse_code) if warehouse_code else None

            if not warehouse_id:
                print(f"  [SKIP] {full_name} - no warehouse for {location}")
                continue

            result = session.execute(select(User).where(User.email == email))
            existing_user = result.scalars().first()

            if existing_user:
                # Check if driver profile exists
                result = session.execute(
                    select(Driver).where(Driver.user_id == existing_user.id)
                )
                if result.scalars().first():
                    pass  # Both exist, skip silently
                else:
                    driver = Driver(
                        user_id=existing_user.id,
                        warehouse_id=warehouse_id,
                        biometric_id=biometric_id,
                        is_available=False,
                    )
                    session.add(driver)
                    drivers_created += 1
                    print(f"  [DRIVER PROFILE] {email}")
            else:
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
                session.flush()

                driver = Driver(
                    user_id=user.id,
                    warehouse_id=warehouse_id,
                    biometric_id=biometric_id,
                    is_available=False,
                )
                session.add(driver)
                drivers_created += 1
                print(f"  [CREATED] {email} ({location})")

        session.commit()
        print(f"\nDrivers created: {drivers_created}")

    engine.dispose()
    print("\n" + "=" * 60)
    print("DONE!")
    print("=" * 60)


if __name__ == "__main__":
    import traceback

    try:
        seed()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
