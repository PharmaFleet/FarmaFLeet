"""
Vercel Cron job endpoints.

These endpoints are designed to be called by Vercel Cron scheduler.
They require CRON_SECRET header authentication instead of user authentication.

Cron schedule (configured in vercel.json):
- /api/v1/cron/auto-archive: Daily at 2 AM UTC - Archives delivered orders older than 24h
- /api/v1/cron/cleanup-old-locations: Daily at 3 AM UTC - Removes driver locations older than 7 days
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy import select, and_, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.api import deps
from app.core.config import settings
from app.models.order import Order, OrderStatus
from app.models.location import DriverLocation
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def verify_cron_secret(authorization: str = Header(None, alias="Authorization")) -> None:
    """
    Verify that the request contains a valid cron secret.
    Vercel sends cron secret in Authorization header as 'Bearer <secret>'.
    """
    if not settings.CRON_SECRET:
        logger.warning("[CRON] CRON_SECRET not configured. Rejecting request.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cron jobs not configured",
        )

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    # Extract token from "Bearer <token>" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    token = parts[1]
    if token != settings.CRON_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid cron secret",
        )


@router.post("/auto-archive")
async def cron_auto_archive_orders(
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(verify_cron_secret),
) -> Dict[str, Any]:
    """
    Auto-archive delivered orders using 24-hour buffer.

    Orders are archived 24 hours after delivery (based on delivered_at field).
    Falls back to 7 days based on updated_at for orders without delivered_at.

    This endpoint is designed to be called by Vercel Cron daily at 2 AM UTC.
    Requires CRON_SECRET for authentication.
    """
    now = datetime.now(timezone.utc)
    cutoff_24h = now - timedelta(hours=24)
    cutoff_7d = now - timedelta(days=7)

    # Find delivered orders that should be archived:
    # 1. Orders with delivered_at more than 24 hours ago, OR
    # 2. Legacy orders without delivered_at, using updated_at > 7 days as fallback
    stmt = (
        select(Order)
        .where(Order.status == OrderStatus.DELIVERED)
        .where(Order.is_archived.is_(False))
        .where(
            or_(
                # New logic: delivered_at is set and more than 24 hours ago
                and_(
                    Order.delivered_at.isnot(None),
                    Order.delivered_at < cutoff_24h
                ),
                # Legacy fallback: no delivered_at, use updated_at > 7 days
                and_(
                    Order.delivered_at.is_(None),
                    Order.updated_at < cutoff_7d
                )
            )
        )
    )
    result = await db.execute(stmt)
    orders_to_archive = result.scalars().all()

    archived_count = 0
    for order in orders_to_archive:
        order.is_archived = True
        db.add(order)
        archived_count += 1

    await db.commit()

    logger.info(f"[CRON] Auto-archive completed: {archived_count} orders archived")
    return {
        "success": True,
        "message": f"Archived {archived_count} orders",
        "archived_count": archived_count,
        "timestamp": now.isoformat(),
    }


@router.post("/cleanup-old-locations")
async def cron_cleanup_old_locations(
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(verify_cron_secret),
) -> Dict[str, Any]:
    """
    Delete driver location records older than 7 days.

    This keeps the driver_location table from growing unbounded while
    retaining enough history for recent route analysis.

    This endpoint is designed to be called by Vercel Cron daily at 3 AM UTC.
    Requires CRON_SECRET for authentication.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=7)

    # Delete old location records
    stmt = delete(DriverLocation).where(DriverLocation.timestamp < cutoff)
    result = await db.execute(stmt)
    deleted_count = result.rowcount

    await db.commit()

    logger.info(f"[CRON] Location cleanup completed: {deleted_count} records deleted")
    return {
        "success": True,
        "message": f"Deleted {deleted_count} old location records",
        "deleted_count": deleted_count,
        "cutoff_date": cutoff.isoformat(),
        "timestamp": now.isoformat(),
    }
