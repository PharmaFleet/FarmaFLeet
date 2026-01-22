from typing import Any, List, Dict, Optional
from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.order import Order, OrderStatus, ProofOfDelivery
from app.models.driver import Driver
from app.models.user import User

router = APIRouter()


@router.post("/status-updates")
async def sync_status_updates(
    updates: List[Dict[str, Any]] = Body(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Sync offline status updates.
    """
    processed = 0
    errors = []

    for update in updates:
        order_id = update.get("order_id")
        status = update.get("status")
        timestamp = update.get("timestamp")

        # Logic to update order status retrospectively or check if newer status exists
        # Simplified:
        order = await db.get(Order, order_id)
        if order:
            order.status = status
            db.add(order)
            processed += 1
        else:
            errors.append({"id": order_id, "msg": "Order not found"})

    await db.commit()
    return {"processed": processed, "errors": errors}


@router.get("/orders/{driver_id}")
async def sync_driver_orders(
    driver_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get full list of active orders for offline sync.
    """
    # Verify driver matches user roughly or is admin

    query = select(Order).where(
        Order.driver_id == driver_id,
        Order.status.in_([OrderStatus.ASSIGNED, OrderStatus.OUT_FOR_DELIVERY]),
    )
    result = await db.execute(query)
    orders = result.scalars().all()
    # Should return full details including customer info
    return orders


@router.post("/proof-of-delivery")
async def sync_proof_of_delivery(
    order_id: int = Body(..., embed=True),
    signature_url: Optional[str] = Body(None, embed=True),
    photo_url: Optional[str] = Body(None, embed=True),
    timestamp: Optional[datetime] = Body(None, embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Sync offline proof of delivery.
    """
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    pod = ProofOfDelivery(
        order_id=order.id,
        signature_url=signature_url,
        photo_url=photo_url,
        timestamp=timestamp or datetime.utcnow(),
    )
    db.add(pod)

    order.status = OrderStatus.DELIVERED
    db.add(order)

    await db.commit()
    return {"msg": "POD synced"}
