from app.db.session import SessionLocal
from app.models.financial import PaymentCollection
from app.models.order import Order, OrderStatus
from sqlalchemy import select, and_
import asyncio
from datetime import datetime, timezone


async def backfill_payments():
    async with SessionLocal() as db:
        print("Starting backfill...")

        # 1. Get all DELIVERED, CASH/COD orders
        query = select(Order).where(
            and_(Order.status == OrderStatus.DELIVERED, Order.total_amount > 0)
        )
        result = await db.execute(query)
        orders = result.scalars().all()

        created_count = 0

        for order in orders:
            # Check payment method case-insensitive
            method = order.payment_method.upper() if order.payment_method else ""
            if method not in ["CASH", "COD"]:
                continue

            # Check if payment already exists
            existing = await db.scalar(
                select(PaymentCollection).where(PaymentCollection.order_id == order.id)
            )

            if not existing:
                print(
                    f"Creating payment for Order {order.id} ({order.total_amount} KWD)"
                )
                # Fix: removed 'status' arg, ensured collected_at is set
                payment = PaymentCollection(
                    order_id=order.id,
                    driver_id=order.driver_id,
                    amount=order.total_amount,
                    method=order.payment_method,
                    collected_at=order.updated_at or datetime.now(timezone.utc),
                )
                db.add(payment)
                created_count += 1

        if created_count > 0:
            await db.commit()
            print(f"Successfully backfilled {created_count} payments.")
        else:
            print("No missing payments found.")


if __name__ == "__main__":
    asyncio.run(backfill_payments())
