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
        engine = create_async_engine(
            DATABASE_URL, connect_args={"statement_cache_size": 0}
        )
        async with engine.connect() as conn:
            print("Checking existence of 'idx_warehouse_location'...")
            result = await conn.execute(
                text(
                    "SELECT indexname, tablename, schemaname FROM pg_indexes WHERE indexname = 'idx_warehouse_location';"
                )
            )
            indexes = result.fetchall()
            print("Found in pg_indexes:", indexes)

            # If found, try to drop it
            for idx in indexes:
                print(f"Dropping index {idx[0]} on {idx[1]}...")
                try:
                    # DROP INDEX CONCURRENTLY cannot run in transaction block of python usually?
                    await conn.execute(text(f"DROP INDEX IF EXISTS {idx[0]};"))
                    print("Dropped.")
                except Exception as e:
                    print(f"Failed to drop: {e}")

    except Exception as e:
        print(f"Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(check())
