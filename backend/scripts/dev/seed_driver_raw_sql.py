import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext

# Config
# Appending statement_cache_size=0 to DSN to strictly disable prepared statements for PgBouncer
DATABASE_URL = "postgresql+asyncpg://postgres.ubmgphjlpjovebkuthrf:Pharmafleet0101@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?statement_cache_size=0"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


async def seed_driver():
    print(f"Connecting to: {DATABASE_URL.split('@')[1]}...")
    # Explicitly set statement_cache_size=0
    engine = create_async_engine(DATABASE_URL, connect_args={"statement_cache_size": 0})

    try:
        async with engine.begin() as conn:  # Begin transaction automatically
            print("Checking for existing user...")
            result = await conn.execute(
                text(
                    "SELECT id FROM public.user WHERE email = 'testdriver@pharmafleet.com'"
                )
            )
            existing = result.scalar()

            if existing:
                print("✅ User already exists. Resetting password...")
                hashed_pw = get_password_hash("test123")
                await conn.execute(
                    text(
                        "UPDATE public.user SET hashed_password = :pw, is_active = true WHERE id = :id"
                    ),
                    {"pw": hashed_pw, "id": existing},
                )
                user_id = existing
            else:
                print("Creating new user...")
                hashed_pw = get_password_hash("test123")
                # Insert User
                result = await conn.execute(
                    text("""
                        INSERT INTO public.user (email, hashed_password, full_name, role, is_active, is_superuser)
                        VALUES (:email, :pw, 'Test Driver', 'driver', true, false)
                        RETURNING id
                    """),
                    {"email": "testdriver@pharmafleet.com", "pw": hashed_pw},
                )
                user_id = result.scalar()
                print(f"Created User ID: {user_id}")

            # Check Driver Profile
            result = await conn.execute(
                text("SELECT id FROM public.driver WHERE user_id = :uid"),
                {"uid": user_id},
            )
            existing_driver = result.scalar()

            if existing_driver:
                print("✅ Driver profile exists.")
            else:
                print("Creating driver profile...")
                await conn.execute(
                    text("""
                        INSERT INTO public.driver (user_id, is_available, warehouse_id)
                        VALUES (:uid, true, 1)
                    """),
                    {"uid": user_id},
                )
                print("✅ Driver profile created.")

    except Exception as e:
        print(f"❌ Failed: {e}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_driver())
