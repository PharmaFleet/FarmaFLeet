import asyncio
from app.db.session import SessionLocal
from app.models.user import User
from app.models.driver import Driver
from app.models.warehouse import Warehouse
from app.core.security import get_password_hash
from sqlalchemy import select

DRIVERS_DATA = [
    {
        "name": "Ali Ramadan Ali Ibrahim",
        "bio": "2838",
        "code": "B11",
        "contact": "96759116",
    },
    {
        "name": "Assran Ismael Ahmed",
        "bio": "7388",
        "code": "E24",
        "contact": "57030584",
    },
    {"name": "Ahmed Mehrous", "bio": "7459", "code": "B29", "contact": "97570453"},
    {"name": "Gamal Rezk Mohamed", "bio": "1772", "code": "B16", "contact": "65787369"},
    {
        "name": "Hossny Shehata Mohamed",
        "bio": "2874",
        "code": "B39",
        "contact": "97593909",
    },
    {
        "name": "Khalid Zoalnoon Ahmed",
        "bio": "7375",
        "code": "B20",
        "contact": "97202128",
    },
    {"name": "Abdulkreem Khalid", "bio": "7462", "code": "B28", "contact": "90712948"},
    {"name": "Ahmed Tahwir", "bio": "7470", "code": "B19", "contact": "94947608"},
    {"name": "Yousif Omer", "bio": "7473", "code": "B15", "contact": "95934706"},
    {"name": "Elmardi Osman", "bio": "1976", "code": "B9", "contact": "99308075"},
]


async def seed():
    async with SessionLocal() as db:
        # Get first available warehouse
        wh_res = await db.execute(select(Warehouse.id))
        warehouse_id = wh_res.scalars().first()

        if not warehouse_id:
            print("No warehouse found. Run setup_warehouse.py first.")
            return

        print(
            f"Starting seeding of {len(DRIVERS_DATA)} drivers using Warehouse ID: {warehouse_id}..."
        )
        for data in DRIVERS_DATA:
            # Generate a mock email based on name
            email = f"{data['name'].lower().replace(' ', '.')}@pharmafleet.com"

            # Check if user exists
            stmt = select(User).where(User.email == email)
            res = await db.execute(stmt)
            if res.scalars().first():
                # print(f"Skipping {email} (already exists)")
                continue

            # Create User
            user = User(
                email=email,
                full_name=data["name"],
                hashed_password=get_password_hash("driver123"),  # Default password
                role="driver",
                is_active=True,
            )
            db.add(user)
            await db.flush()

            # Create Driver
            driver = Driver(
                user_id=user.id,
                vehicle_info=f"PHX-{data['code']}",
                biometric_id=data["bio"],
                warehouse_id=warehouse_id,
                is_available=True,
            )
            db.add(driver)
            print(f"Created driver: {data['name']} (ID: {user.id})")

        await db.commit()
        print("Seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
