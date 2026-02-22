from datetime import datetime, time, timezone, timedelta
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, desc, cast, Date
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.driver import Driver
from app.models.order import Order, OrderStatus, OrderStatusHistory
from app.models.warehouse import Warehouse
from app.models.user import User
from app.models.financial import PaymentCollection

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/activities")
async def get_recent_activities(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Get recent system activities (Assignments, Deliveries, Status Changes, Payments).
    """
    from datetime import datetime, timezone

    def to_utc_iso(dt: datetime | None) -> str | None:
        """Convert datetime to UTC ISO string with Z suffix."""
        if dt is None:
            return None
        # If naive, assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")

    activities = []

    # 1. Recent Order Status Changes (from OrderStatusHistory)
    status_history_query = (
        select(OrderStatusHistory)
        .options(
            selectinload(OrderStatusHistory.order).selectinload(Order.driver).selectinload(Driver.user)
        )
        .order_by(desc(OrderStatusHistory.timestamp))
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
                "body": f"Order {order.sales_order_number or order.id if order else 'N/A'} assigned to {driver_name}",
                "created_at": to_utc_iso(history.timestamp),
                "data": {"type": "assigned", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.DELIVERED:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Order Delivered",
                "body": f"Order {order.sales_order_number or order.id if order else 'N/A'} delivered by {driver_name}",
                "created_at": to_utc_iso(history.timestamp),
                "data": {"type": "order_delivered", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.PICKED_UP:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Order Picked Up",
                "body": f"Order {order.sales_order_number or order.id if order else 'N/A'} picked up by {driver_name}",
                "created_at": to_utc_iso(history.timestamp),
                "data": {"type": "picked_up", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.OUT_FOR_DELIVERY:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Out for Delivery",
                "body": f"Order {order.sales_order_number or order.id if order else 'N/A'} is out for delivery",
                "created_at": to_utc_iso(history.timestamp),
                "data": {"type": "out_for_delivery", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.CANCELLED:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Order Cancelled",
                "body": f"Order {order.sales_order_number or order.id if order else 'N/A'} was cancelled",
                "created_at": to_utc_iso(history.timestamp),
                "data": {"type": "cancelled", "order_id": order.id if order else None},
            })
        elif history.status == OrderStatus.REJECTED:
            activities.append({
                "id": f"hist_{history.id}",
                "title": "Order Rejected",
                "body": f"Order {order.sales_order_number or order.id if order else 'N/A'} was rejected",
                "created_at": to_utc_iso(history.timestamp),
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
            "created_at": to_utc_iso(payment.collected_at),
            "data": {"type": "payment_collected", "order_id": payment.order_id},
        })

    # 3. Recent Payment Verifications
    verified_payments_query = (
        select(PaymentCollection)
        .where(PaymentCollection.verified_at.is_not(None))
        .order_by(desc(PaymentCollection.verified_at))
        .limit(limit)
    )
    res_verified = await db.execute(verified_payments_query)
    for payment in res_verified.scalars():
        activities.append({
            "id": f"pay_verified_{payment.id}",
            "title": "Payment Verified",
            "body": f"KWD {payment.amount:.3f} verified for Order #{payment.order_id}",
            "created_at": to_utc_iso(payment.verified_at),
            "data": {"type": "payment_verified", "order_id": payment.order_id},
        })

    # Sort by date and return top N (ISO strings sort correctly alphabetically)
    try:
        activities.sort(key=lambda x: x["created_at"] or "", reverse=True)
    except Exception as e:
        logger.error(f"Error sorting activities: {e}")

    return activities[:limit]


@router.get("/executive-dashboard")
async def executive_dashboard(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Get executive high-level metrics.
    """
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min)

    # Active Orders (all non-archived pending/assigned/out_for_delivery)
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

    # Unassigned orders today (pending + created today)
    unassigned_today = await db.scalar(
        select(func.count(Order.id)).where(
            Order.status == OrderStatus.PENDING,
            Order.created_at >= today_start,
        )
    )

    # Active Drivers
    online_drivers = await db.scalar(
        select(func.count(Driver.id)).where(Driver.is_available)
    )

    # Today's delivered count & revenue
    delivered_query = select(
        func.count(Order.id).label("count"),
        func.sum(Order.total_amount).label("revenue"),
    ).where(Order.status == OrderStatus.DELIVERED, Order.created_at >= today_start)
    delivered_res = await db.execute(delivered_query)
    delivered_data = delivered_res.one()

    total_today = await db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )

    # All-time success rate (delivered / total non-archived)
    total_all = await db.scalar(
        select(func.count(Order.id)).where(Order.is_archived.is_(False))
    )
    delivered_all = await db.scalar(
        select(func.count(Order.id)).where(
            Order.status == OrderStatus.DELIVERED,
            Order.is_archived.is_(False),
        )
    )

    # Payments
    pay_query = select(
        func.count(PaymentCollection.id).label("count"),
        func.sum(PaymentCollection.amount).label("amount"),
    ).where(PaymentCollection.verified_at.is_(None))
    pay_res = await db.execute(pay_query)
    pay_data = pay_res.one()

    # Today's success rate
    today_rate = (
        (delivered_data.count / total_today) if total_today and total_today > 0 else 0.0
    )
    # All-time success rate
    all_time_rate = (
        (delivered_all / total_all) if total_all and total_all > 0 else 0.0
    )

    return {
        "total_orders_today": active_orders or 0,
        "unassigned_today": unassigned_today or 0,
        "active_drivers": online_drivers or 0,
        "pending_payments_amount": float(pay_data.amount or 0.0),
        "pending_payments_count": pay_data.count or 0,
        "success_rate": round(today_rate, 4),
        "all_time_success_rate": round(all_time_rate, 4),
        "system_health": "Healthy",
    }


@router.get("/orders-today")
async def orders_today(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, int]:
    """Get total orders created today."""
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min)
    count = await db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )
    return {"count": count or 0}


@router.get("/active-drivers")
async def active_drivers(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, int]:
    """Get count of active (online) drivers."""
    count = await db.scalar(select(func.count(Driver.id)).where(Driver.is_available))
    return {"count": count or 0}


@router.get("/success-rate")
async def success_rate(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, float]:
    """Get today's delivery success rate."""
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min)

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
) -> List[Dict[str, Any]]:
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
) -> List[Dict[str, Any]]:
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


@router.get("/daily-orders")
async def daily_orders(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    days: int = 7,
) -> List[Dict[str, Any]]:
    """
    Get daily order counts for the last N days (default 7).
    Returns date, total, delivered, and pending counts per day.
    """
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days - 1)).date()

    # Get counts grouped by date
    date_col = func.date(Order.created_at)
    query = (
        select(
            date_col.label("date"),
            func.count(Order.id).label("total"),
            func.sum(case((Order.status == OrderStatus.DELIVERED, 1), else_=0)).label("delivered"),
            func.sum(case((Order.status == OrderStatus.PENDING, 1), else_=0)).label("pending"),
        )
        .where(Order.created_at >= datetime.combine(start_date, time.min))
        .group_by(date_col)
        .order_by(date_col)
    )

    result = await db.execute(query)
    rows = result.all()

    # Build a dict for quick lookup
    data_map = {}
    for row in rows:
        date_str = str(row.date)
        data_map[date_str] = {
            "date": date_str,
            "total": row.total or 0,
            "delivered": row.delivered or 0,
            "pending": row.pending or 0,
        }

    # Fill in missing days with zeros
    daily = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        date_str = str(d)
        if date_str in data_map:
            daily.append(data_map[date_str])
        else:
            daily.append({"date": date_str, "total": 0, "delivered": 0, "pending": 0})

    return daily
