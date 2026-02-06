import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()


async def check_db():
    db_url = os.getenv("DB_URL")
    if not db_url:
        print("DB_URL not found in .env")
        return

    # Convert postgresql:// to postgresql+asyncpg:// if needed
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    print(f"Connecting to {db_url}...")
    engine = create_async_engine(db_url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text('SELECT email, role, is_superuser FROM "user";')
            )
            rows = result.fetchall()
            print("Users in database:")
            for row in rows:
                print(
                    f"Email: {row.email}, Role: {row.role}, Superuser: {row.is_superuser}"
                )
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(check_db())
