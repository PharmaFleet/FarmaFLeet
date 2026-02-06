import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.environ.get("DATABASE_URL")


async def check():
    if not DATABASE_URL:
        print("DATABASE_URL not set")
        return

    try:
        # Use isolation_level="AUTOCOMMIT" to allow CREATE EXTENSION if needed
        # Disable prepared statements for PgBouncer (Supabase Transaction Pooler)
        engine = create_async_engine(
            DATABASE_URL,
            isolation_level="AUTOCOMMIT",
            connect_args={"statement_cache_size": 0},
        )
        async with engine.connect() as conn:
            print(f"Connected to {DATABASE_URL.split('@')[1]}")
            result = await conn.execute(text("SELECT extname FROM pg_extension;"))
            extensions = [row[0] for row in result]
            print("Installed extensions:", extensions)

            if "postgis" not in extensions:
                print("PostGIS not found. Attempting to enable...")
                try:
                    await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                    print("PostGIS enabled successfully.")
                except Exception as e:
                    print(f"Failed to enable PostGIS: {e}")
            else:
                print("PostGIS is already enabled.")
    except Exception as e:
        print(f"Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(check())
