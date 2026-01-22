from typing import Any, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api import deps
from app.models.financial import PaymentCollection, PaymentMethod
from app.models.order import Order
from app.models.user import User
from app.schemas.payment import (
    PaymentCollection as PaymentSchema,
    PaymentCollectionCreate,
)

router = APIRouter()


@router.get("/pending", response_model=List[PaymentSchema])
async def read_pending_payments(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all pending payments (not yet verified).
    """
    query = select(PaymentCollection).where(PaymentCollection.verified_at == None)
    result = await db.execute(query)
    payments = result.scalars().all()
    return payments


@router.post("/collection", response_model=PaymentSchema)
async def collect_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_in: PaymentCollectionCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Record a payment collection from an order.
    """
    # Verify order exists
    order = await db.get(Order, payment_in.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = PaymentCollection(
        order_id=payment_in.order_id,
        driver_id=payment_in.driver_id,  # Typically derived from token if driver
        amount=payment_in.amount,
        method=payment_in.method,
        transaction_id=payment_in.transaction_id,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


@router.post("/{payment_id}/clear")
async def clear_payment(
    payment_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),  # Manager
) -> Any:
    """
    Verify/clear a payment collection.
    """
    payment = await db.get(PaymentCollection, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    from datetime import datetime

    payment.verified_by_id = current_user.id
    payment.verified_at = datetime.utcnow()

    db.add(payment)
    await db.commit()
    return {"msg": "Payment verified successfully"}


@router.get("/report")
async def payment_report(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Generate payment report.
    """
    # Simple aggregation example
    query = select(
        PaymentCollection.method, func.sum(PaymentCollection.amount).label("total")
    ).group_by(PaymentCollection.method)

    result = await db.execute(query)
    report = [{"method": row.method, "total": row.total} for row in result]
    return report
