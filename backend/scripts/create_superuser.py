import asyncio
import logging
import sys
import os

# Add parent directory to path to allow importing app
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models import User, UserRole  # Ensures all models are loaded via __init__
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_superuser() -> None:
    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "admin@example.com")
        )
        user = result.scalars().first()
        if not user:
            user = User(
                email="admin@example.com",
                full_name="Super Admin",
                hashed_password=get_password_hash("password"),
                is_superuser=True,
                is_active=True,
                role=UserRole.SUPER_ADMIN,
            )
            session.add(user)
            await session.commit()
            logger.info("Superuser created")
        else:
            logger.info("Superuser already exists")


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(create_superuser())
