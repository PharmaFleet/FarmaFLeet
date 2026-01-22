import asyncio
import asyncpg
from app.core.config import settings


async def check_db():
    print(f"Connecting to {settings.POSTGRES_SERVER}...")
    try:
        conn = await asyncpg.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host="localhost",
            port=settings.POSTGRES_PORT,
            database="postgres",  # Connect to default db first
        )
        version = await conn.fetchval("SELECT version()")
        print(f"Database Version: {version}")

        extensions = await conn.fetch(
            "SELECT * FROM pg_available_extensions WHERE name = 'postgis'"
        )
        print(f"Available extensions matching 'postgis': {len(extensions)}")
        for ext in extensions:
            print(
                f" - {ext['name']}: {ext['default_version']} (installed: {ext['installed_version']})"
            )

        print("Attempting to CREATE EXTENSION postgis...")
        try:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis")
            print("Extension created successfully!")
        except Exception as e:
            print(f"Failed to create extension: {e}")

        await conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(check_db())
