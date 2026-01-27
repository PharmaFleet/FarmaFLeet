import asyncio
from app.db.session import SessionLocal
from sqlalchemy import select
from app.models.user import User


async def run():
    async with SessionLocal() as db:
        res = await db.execute(select(User.id, User.email, User.full_name).limit(10))
        users = res.all()
        print("\nValid Users for Driver Registration:")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Name: {u.full_name}")


if __name__ == "__main__":
    asyncio.run(run())
