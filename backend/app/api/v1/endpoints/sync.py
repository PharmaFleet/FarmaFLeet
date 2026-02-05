from typing import Any, List, Dict, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.order import Order, OrderStatus, OrderStatusHistory, ProofOfDelivery
from app.models.driver import Driver
from app.models.user import User, UserRole

router = APIRouter()


@router.post("/status-updates")
async def sync_status_updates(
    updates: List[Dict[str, Any]] = Body(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Sync offline status updates.
    Verifies the caller is a driver and the order is assigned to them.
    """
    # Verify caller is a driver
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can sync status updates")

    # Get driver record
    drv_result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = drv_result.scalars().first()
    if not driver:
        raise HTTPException(status_code=403, detail="Driver profile not found")

    processed = 0
    errors = []

    for update in updates:
        order_id = update.get("order_id")
        status_str = update.get("status")
        notes = update.get("notes")

        # Validate status enum
        try:
            status_enum = OrderStatus(status_str)
        except (ValueError, KeyError):
            errors.append({"order_id": order_id, "error": f"Invalid status: {status_str}"})
            continue

        order = await db.get(Order, order_id)
        if not order:
            errors.append({"order_id": order_id, "error": "Order not found"})
            continue

        # Verify the order is assigned to this driver
        if order.driver_id != driver.id:
            errors.append({"order_id": order_id, "error": "Order not assigned to you"})
            continue

        order.status = status_enum

        # Set status transition timestamps
        if status_enum == OrderStatus.ASSIGNED:
            order.assigned_at = datetime.now(timezone.utc)
        elif status_enum == OrderStatus.PICKED_UP:
            order.picked_up_at = datetime.now(timezone.utc)
        elif status_enum == OrderStatus.DELIVERED:
            order.delivered_at = datetime.now(timezone.utc)

        # Create status history entry
        history = OrderStatusHistory(
            order_id=order.id,
            status=status_enum,
            notes=notes or f"Synced offline: {status_enum.value}",
        )
        db.add(history)
        db.add(order)
        processed += 1

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
        Order.status.in_([OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY]),
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
) -> Dict[str, str]:
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
        timestamp=timestamp or datetime.now(timezone.utc),
    )
    db.add(pod)

    order.status = OrderStatus.DELIVERED
    order.delivered_at = datetime.now(timezone.utc)
    db.add(order)

    await db.commit()
    return {"msg": "POD synced"}
