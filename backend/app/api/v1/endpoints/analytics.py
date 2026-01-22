from typing import Any, List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.api import deps
from app.models.driver import Driver
from app.models.order import Order, OrderStatus
from app.models.warehouse import Warehouse
from app.models.user import User

router = APIRouter()


@router.get("/executive-dashboard")
async def executive_dashboard(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get executive high-level metrics.
    """
    # Total Active Orders
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
        select(func.count(Driver.id)).where(Driver.is_available == True)
    )

    # Revenue (simple sum of delivered)
    revenue = await db.scalar(
        select(func.sum(Order.total_amount)).where(
            Order.status == OrderStatus.DELIVERED
        )
    )

    return {
        "total_active_orders": active_orders or 0,
        "total_online_drivers": online_drivers or 0,
        "today_revenue": revenue or 0.0,
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
    count = await db.scalar(
        select(func.count(Driver.id)).where(Driver.is_available == True)
    )
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
