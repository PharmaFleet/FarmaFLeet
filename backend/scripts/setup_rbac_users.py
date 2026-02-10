import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import SessionLocal
from app.models import User, UserRole
from app.core.security import get_password_hash


async def setup_rbac_users():
    users_to_create = [
        {
            "email": "manager@example.com",
            "role": UserRole.WAREHOUSE_MANAGER,
            "name": "Warehouse Manager",
        },
        {
            "email": "dispatcher@example.com",
            "role": UserRole.DISPATCHER,
            "name": "Dispatcher",
        },
        {
            "email": "executive@example.com",
            "role": UserRole.EXECUTIVE,
            "name": "Executive",
        },
    ]

    async with SessionLocal() as session:
        for u_data in users_to_create:
            from sqlalchemy import select

            result = await session.execute(
                select(User).where(User.email == u_data["email"])
            )
            existing = result.scalars().first()
            if not existing:
                user = User(
                    email=u_data["email"],
                    full_name=u_data["name"],
                    hashed_password=get_password_hash("password"),
                    role=u_data["role"],
                    is_active=True,
                    is_superuser=False,
                )
                session.add(user)
                print(f"Created {u_data['role']}")
            else:
                print(f"User {u_data['role']} already exists")
        await session.commit()


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(setup_rbac_users())
