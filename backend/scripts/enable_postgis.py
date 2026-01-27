import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings


async def main():
    try:
        db_url = str(settings.SQLALCHEMY_DATABASE_URI)
        print(f"Connecting to database...")
        engine = create_async_engine(db_url)
        async with engine.begin() as conn:
            print("Enabling PostGIS...")
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            print("PostGIS enabled successfully.")
        await engine.dispose()
    except Exception as e:
        print(f"Error enabling PostGIS: {e}")
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
