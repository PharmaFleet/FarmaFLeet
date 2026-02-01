import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Connection string from Deployment Plan
# Using the Transaction Pooler (port 6543)
DATABASE_URL = "postgresql+asyncpg://postgres.ubmgphjlpjovebkuthrf:Pharmafleet0101@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"


async def verify_data():
    print(f"Connecting to: {DATABASE_URL.split('@')[1]}...")

    # Disable statement cache for PgBouncer compatibility
    engine = create_async_engine(DATABASE_URL, connect_args={"statement_cache_size": 0})

    try:
        async with engine.connect() as conn:
            # check extensions
            print("\n--- Extensions ---")
            result = await conn.execute(
                text("SELECT * FROM pg_extension WHERE extname = 'postgis'")
            )
            if result.scalar():
                print("✅ PostGIS is ENABLED")
            else:
                print("❌ PostGIS is DISABLED")

            # check tables
            print("\n--- Table Counts ---")
            tables = [
                "user",
                "driver",
                "warehouse",
                "order",
            ]  # quote user to avoid keyword conflict if necessary, though in postgres 'user' is reserved, usually "user" or public.user works. SQLAlchemy handles it if using models, but here raw sql.
            # actually 'user' is a reserved word in postgres, often need quotes

            for t in tables:
                try:
                    # using public."table" schema
                    query = text(f'SELECT count(*) FROM public."{t}"')
                    result = await conn.execute(query)
                    count = result.scalar()
                    print(f"✅ Table '{t}': {count} rows")
                except Exception as e:
                    print(f"❌ Table '{t}': Error - {str(e)}")

    except Exception as e:
        print(f"❌ Connection Failed: {e}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(verify_data())
