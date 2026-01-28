import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.db.base import User
from app.core.config import settings


async def list_users():
    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"Found {len(users)} users:")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")


if __name__ == "__main__":
    asyncio.run(list_users())
