from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, desc, literal
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.driver import Driver
from app.models.order import Order, OrderStatus, OrderStatusHistory
from app.models.warehouse import Warehouse
from app.models.user import User
from app.models.financial import PaymentCollection

router = APIRouter()


@router.get("/activities")
async def get_recent_activities(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    limit: int = 20,
) -> Any:
    """
    Get recent system activities (Assignments, Deliveries, Status Changes, Payments).
    """
    from datetime import datetime

    activities = []

    # 1. Recent Order Status Changes (from OrderStatusHistory)
    status_history_query = (
        select(OrderStatusHistory)
        .options(
            selectinload(OrderStatusHistory.order).selectinload(Order.driver).selectinload(Driver.user)
        )
        .order_by(desc(OrderStatusHistory.changed_at))
        .limit(limit)
    )
    res_history = await db.execute(status_history_query)
    for history in res_history.scalars():
        order = history.order
        driver_name = "Unassigned"
        if order and order.driver and order.driver.user:
            driver_name = order.driver.user.full_name or order.driver.user.email

        # Determine activity type and message based on status
        if history.status == OrderStatus.ASSIGNED:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Order Assigned",
                "body": f"Order #{order.id if order else 'N/A'} assigned to {driver_name}",
                "created_at": history.changed_at,
                "data": {"type": "assigned", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.DELIVERED:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Order Delivered",
                "body": f"Order #{order.id if order else 'N/A'} delivered by {driver_name}",
                "created_at": history.changed_at,
                "data": {"type": "order_delivered", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.PICKED_UP:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Order Picked Up",
                "body": f"Order #{order.id if order else 'N/A'} picked up by {driver_name}",
                "created_at": history.changed_at,
                "data": {"type": "picked_up", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.OUT_FOR_DELIVERY:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Out for Delivery",
                "body": f"Order #{order.id if order else 'N/A'} is out for delivery",
                "created_at": history.changed_at,
                "data": {"type": "out_for_delivery", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.CANCELLED:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Order Cancelled",
                "body": f"Order #{order.id if order else 'N/A'} was cancelled",
                "created_at": history.changed_at,
                "data": {"type": "cancelled", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.REJECTED:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Order Rejected",
                "body": f"Order #{order.id if order else 'N/A'} was rejected",
                "created_at": history.changed_at,
                "data": {"type": "rejected", "order_id": order.id if order else None},
            })

    # 2. Recent Payments
    payments_query = (
        select(PaymentCollection)
        .order_by(desc(PaymentCollection.collected_at))
        .limit(limit)
    )
    res_p = await db.execute(payments_query)
    for payment in res_p.scalars():
        activities.append({
            "id": f"pay_{payment.id}",
            "title": "Payment Collected",
            "body": f"KWD {payment.amount:.3f} collected for Order #{payment.order_id}",
            "created_at": payment.collected_at,
            "data": {"type": "payment_collected", "order_id": payment.order_id},
        })

    # Sort by date and return top N
    def safe_date(d):
        return d if d else datetime.min

    try:
        activities.sort(key=lambda x: safe_date(x["created_at"]), reverse=True)
    except Exception as e:
        print(f"Error sorting activities: {e}")

    return activities[:limit]


@router.get("/executive-dashboard")
async def executive_dashboard(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get executive high-level metrics.
    """
    # Total Active Orders (Today's Pending/In-Transit)
    from datetime import datetime, time

    today_start = datetime.combine(datetime.utcnow().date(), time.min)

    active_orders = await db.scalar(
        select(func.count(Order.id)).where(
            Order.status.in_(
                [
                    OrderStatus.PENDING,
                    OrderStatus.ASSIGNED,
                    OrderStatus.OUT_FOR_DELIVERY,
                ]
            )
        )
    )

    # Active Drivers
    online_drivers = await db.scalar(
        select(func.count(Driver.id)).where(Driver.is_available)
    )

    # Revenue & Success Rate (Today's)
    delivered_query = select(
        func.count(Order.id).label("count"),
        func.sum(Order.total_amount).label("revenue"),
    ).where(Order.status == OrderStatus.DELIVERED, Order.created_at >= today_start)
    delivered_res = await db.execute(delivered_query)
    delivered_data = delivered_res.one()

    total_today = await db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )

    # Payments
    pay_query = select(
        func.count(PaymentCollection.id).label("count"),
        func.sum(PaymentCollection.amount).label("amount"),
    ).where(PaymentCollection.verified_at.is_(None))
    pay_res = await db.execute(pay_query)
    pay_data = pay_res.one()

    # Success rate
    rate = (
        (delivered_data.count / total_today) if total_today and total_today > 0 else 1.0
    )

    return {
        "total_orders_today": active_orders or 0,
        "active_drivers": online_drivers or 0,
        "pending_payments_amount": float(pay_data.amount or 0.0),
        "pending_payments_count": pay_data.count or 0,
        "success_rate": round(rate, 4),
        "system_health": "Healthy",
    }


@router.get("/orders-today")
async def orders_today(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get total orders created today."""
    from datetime import datetime, time

    today_start = datetime.combine(datetime.utcnow().date(), time.min)
    count = await db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )
    return {"count": count or 0}


@router.get("/active-drivers")
async def active_drivers(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get count of active (online) drivers."""
    count = await db.scalar(select(func.count(Driver.id)).where(Driver.is_available))
    return {"count": count or 0}


@router.get("/success-rate")
async def success_rate(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get today's delivery success rate."""
    from datetime import datetime, time

    today_start = datetime.combine(datetime.utcnow().date(), time.min)

    total = await db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )
    delivered = await db.scalar(
        select(func.count(Order.id))
        .where(Order.created_at >= today_start)
        .where(Order.status == OrderStatus.DELIVERED)
    )

    rate = (delivered / total * 100) if total and total > 0 else 100.0
    return {"rate": round(rate, 2)}


@router.get("/driver-performance")
async def driver_performance(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get performance stats per driver.
    """
    # Complex aggregation
    # Count total, delivered, rejected
    query = (
        select(
            Driver.id,
            func.count(Order.id).label("total"),
            func.sum(case((Order.status == OrderStatus.DELIVERED, 1), else_=0)).label(
                "delivered"
            ),
            func.sum(case((Order.status == OrderStatus.REJECTED, 1), else_=0)).label(
                "rejected"
            ),
        )
        .join(Order, Order.driver_id == Driver.id)
        .group_by(Driver.id)
    )

    result = await db.execute(query)
    rows = result.all()

    stats = []
    for row in rows:
        total = row.total
        delivered = row.delivered or 0
        success_rate = (delivered / total * 100) if total > 0 else 0
        stats.append(
            {
                "driver_id": row.id,
                "total_orders": total,
                "delivered_orders": delivered,
                "failed_orders": row.rejected or 0,
                "success_rate": round(success_rate, 2),
            }
        )

    return stats


@router.get("/orders-by-warehouse")
async def orders_by_warehouse(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get order counts by warehouse.
    """
    query = (
        select(Warehouse.name, func.count(Order.id).label("count"))
        .join(Order, Order.warehouse_id == Warehouse.id)
        .group_by(Warehouse.id, Warehouse.name)
    )

    result = await db.execute(query)
    return [{"warehouse": row.name, "orders": row.count} for row in result]


# No changes needed if all routes are specific like /dashboard, /driver-performance, etc.
# But I will check if there's any @router.get("/")
