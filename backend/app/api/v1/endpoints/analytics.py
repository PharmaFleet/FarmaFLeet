from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, desc, literal

from app.api import deps
from app.models.driver import Driver
from app.models.order import Order, OrderStatus
from app.models.warehouse import Warehouse
from app.models.user import User
from app.models.financial import PaymentCollection

router = APIRouter()


@router.get("/activities")
async def get_recent_activities(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    limit: int = 10,
) -> Any:
    """
    Get recent system activities (Delivered orders, Payments).
    """
    # 1. Recent Delivered Orders
    orders_query = (
        select(
            Order.id,
            literal("order_delivered").label("type"),
            Order.updated_at.label("created_at"),
            Order.id.label("ref_id"),
        )
        .where(Order.status == OrderStatus.DELIVERED)
        .order_by(desc(Order.updated_at))
        .limit(limit)
    )

    # 2. Recent Payments
    payments_query = (
        select(
            PaymentCollection.id,
            literal("payment_collected").label("type"),
            PaymentCollection.collected_at.label("created_at"),
            PaymentCollection.order_id.label("ref_id"),
        )
        .order_by(desc(PaymentCollection.collected_at))
        .limit(limit)
    )

    # Combine? Union is tricky with different tables.
    # Let's simple fetch top N of each and merge in python.

    # Fetch orders
    res_o = await db.execute(orders_query)
    activities = []
    for row in res_o:
        activities.append(
            {
                "id": f"ord_{row.id}",
                "title": f"Order #{row.id} Delivered",
                "body": f"Order #{row.id} was successfully delivered.",
                "created_at": row.created_at,
                "data": {"type": "order_delivered", "id": row.id},
            }
        )

    # Fetch payments
    res_p = await db.execute(payments_query)
    for row in res_p:
        activities.append(
            {
                "id": f"pay_{row.id}",
                "title": "Payment Collected",
                "body": f"Payment collected for Order #{row.ref_id}",
                "created_at": row.created_at,
                "data": {"type": "payment_collected", "id": row.id},
            }
        )

    # Sort and slice
    # Handle None dates safely by defaulting to min datetime
    from datetime import datetime

    def safe_date(d):
        return d if d else datetime.min

    try:
        activities.sort(key=lambda x: safe_date(x["created_at"]), reverse=True)
    except Exception as e:
        print(f"Error sorting activities: {e}")
        # Return unsorted as fallback
        pass

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
