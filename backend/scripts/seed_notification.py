import asyncio
from app.db.session import SessionLocal
from app.models.notification import Notification
from app.models.user import User
from sqlalchemy import select


async def seed_notification():
    async with SessionLocal() as db:
        # Get Admin User
        result = await db.execute(select(User).where(User.email == "admin@example.com"))
        user = result.scalars().first()
        if not user:
            print("❌ Admin user not found")
            return

        # Create Notification
        note = Notification(
            user_id=user.id,
            title="Test Notification",
            body="This is a verify_notifications test.",
            is_read=False,
            data={"type": "test"},
        )
        db.add(note)
        await db.commit()
        print(f"✅ Notification seeded for user {user.id}")


if __name__ == "__main__":
    asyncio.run(seed_notification())
