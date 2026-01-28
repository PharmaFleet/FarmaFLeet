from app.db.session import SessionLocal
from app.models.financial import PaymentCollection
from app.models.order import Order
from sqlalchemy import select
import asyncio


async def check_data():
    async with SessionLocal() as db:
        # Check Payments
        res = await db.execute(select(PaymentCollection))
        payments = res.scalars().all()
        print(f"Total Payments in DB: {len(payments)}")
        for p in payments:
            print(
                f" - ID: {p.id}, Amount: {p.amount}, Method: {p.method}, Verified: {p.verified_at}"
            )

        # Check Delivered Orders that SHOULD have payments
        # Assuming COD/Cash orders need collection
        res_orders = await db.execute(select(Order).where(Order.status == "delivered"))
        orders = res_orders.scalars().all()
        print(f"\nTotal Delivered Orders: {len(orders)}")

        for o in orders:
            print(
                f" - Order {o.id}: Status={o.status}, Method={o.payment_method}, Total={o.total_amount}"
            )


if __name__ == "__main__":
    asyncio.run(check_data())
