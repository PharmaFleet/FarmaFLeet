import asyncio
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import select

ACCOUNTS_DATA = [
    {
        "full_name": "PharmaFleet Super Admin",
        "email": "superadmin@pharmafleet.com",
        "role": "super_admin",
        "is_superuser": True,
    },
    {
        "full_name": "Regional Warehouse Manager",
        "email": "manager@pharmafleet.com",
        "role": "manager",
        "is_superuser": False,
    },
    {
        "full_name": "Executive Director",
        "email": "executive@pharmafleet.com",
        "role": "executive",
        "is_superuser": False,
    },
]


async def seed():
    async with SessionLocal() as db:
        print(f"Starting seeding of {len(ACCOUNTS_DATA)} administrative accounts...")
        for data in ACCOUNTS_DATA:
            # Check if user exists
            stmt = select(User).where(User.email == data["email"])
            res = await db.execute(stmt)
            if res.scalars().first():
                print(f"Skipping {data['email']} (already exists)")
                continue

            # Create User
            user = User(
                email=data["email"],
                full_name=data["full_name"],
                hashed_password=get_password_hash("admin123"),  # Default password
                role=data["role"],
                is_active=True,
                is_superuser=data["is_superuser"],
            )
            db.add(user)
            print(f"Created {data['role']}: {data['full_name']} ({data['email']})")

        await db.commit()
        print("Administrative account seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
