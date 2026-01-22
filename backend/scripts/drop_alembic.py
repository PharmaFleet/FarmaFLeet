
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def drop_alembic():
    async with engine.connect() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE"))
        await conn.commit()
        print("Dropped alembic_version")

if __name__ == "__main__":
    asyncio.run(drop_alembic())
