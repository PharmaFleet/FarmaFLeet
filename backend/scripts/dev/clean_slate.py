import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.environ.get("DATABASE_URL")


async def clean():
    if not DATABASE_URL:
        print("DATABASE_URL not set")
        return

    try:
        engine = create_async_engine(
            DATABASE_URL,
            isolation_level="AUTOCOMMIT",
            connect_args={"statement_cache_size": 0},
        )
        async with engine.connect() as conn:
            print(f"Connected to {DATABASE_URL.split('@')[1]}")

            # List of tables to drop in correct order (dependents first)
            tables = [
                "proofofdelivery",
                "paymentcollection",
                "orderstatushistory",
                '"order"',  # Quoted
                "driverlocation",
                "notification",
                "driver",
                "auditlog",
                "warehouse",
                '"user"',  # Quoted
                "alembic_version",
            ]

            for table in tables:
                print(f"Dropping {table}...")
                try:
                    await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
                except Exception as e:
                    print(f"Error dropping {table}: {e}")

            print("Cleanup complete.")

    except Exception as e:
        print(f"Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(clean())
