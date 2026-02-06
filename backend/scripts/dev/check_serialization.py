import asyncio
from app.db.session import SessionLocal
from app.models.driver import Driver
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.schemas.driver import Driver as DriverSchema


async def check():
    async with SessionLocal() as db:
        stmt = select(Driver).options(selectinload(Driver.user)).limit(5)
        res = await db.execute(stmt)
        drivers = res.scalars().all()

        for d in drivers:
            # Manually convert to dict to see what's there
            data = {
                "id": d.id,
                "user_id": d.user_id,
                "user": {
                    "id": d.user.id,
                    "email": d.user.email,
                    "full_name": d.user.full_name,
                }
                if d.user
                else None,
            }
            print(f"Direct Model: {data}")

            try:
                # Check Pydantic
                schema = DriverSchema.model_validate(d)
                print(f"Pydantic JSON: {schema.model_dump_json(include={'user'})}")
            except Exception as e:
                print(f"Pydantic Error on ID {d.id}: {e}")


if __name__ == "__main__":
    asyncio.run(check())
