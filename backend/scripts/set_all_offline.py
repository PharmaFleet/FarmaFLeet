import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import update
from app.db.base import Driver
from app.core.config import settings


async def set_all_offline():
    print("Setting ALL drivers to OFFLINE...")

    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        await db.execute(update(Driver).values(is_available=False))
        await db.commit()
        print("Done! All drivers are now OFFLINE.")


if __name__ == "__main__":
    asyncio.run(set_all_offline())
