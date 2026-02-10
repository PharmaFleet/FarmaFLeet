import asyncio
import sys
import os

# Set path to include backend
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import engine
import app.db.base # Load all models

from sqlalchemy import text

import traceback

async def create_tables():
    print("Creating tables manually...")
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            await conn.run_sync(app.db.base.Base.metadata.create_all)
        print("Tables created.")
    except Exception as e:
        print(f"Error creating tables: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(create_tables())
