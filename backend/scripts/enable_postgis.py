
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def enable_postgis():
    async with engine.connect() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.commit()
        print("Enabled PostGIS extension")

if __name__ == "__main__":
    asyncio.run(enable_postgis())
