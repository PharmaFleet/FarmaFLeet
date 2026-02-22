"""
Vercel Cron job endpoints.

These endpoints are designed to be called by Vercel Cron scheduler.
They require CRON_SECRET header authentication instead of user authentication.

Cron schedule (configured in vercel.json):
- /api/v1/cron/auto-archive: Daily at 2 AM UTC - Archives delivered orders older than 24h
- /api/v1/cron/cleanup-old-locations: Daily at 3 AM UTC - Removes driver locations older than 7 days
- /api/v1/cron/auto-expire-stale: Daily at 4 AM UTC - Cancels stale pending/assigned orders (7+ days)
- /api/v1/cron/check-driver-shifts: Hourly - Sends shift reminders to drivers online 10+ hours
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy import select, and_, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import Depends

from app.api import deps
from app.core.config import settings
from app.models.order import Order, OrderStatus, OrderStatusHistory
from app.models.driver import Driver
from app.models.user import User
from app.models.location import DriverLocation
from app.services.notification import notification_service
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


@router.post("/auto-expire-stale")
async def cron_auto_expire_stale_orders(
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(verify_cron_secret),
) -> Dict[str, Any]:
    """
    Auto-cancel stale orders that have had no progress for 7+ days.

    Targets orders with status 'pending' or 'assigned' where created_at
    is older than 7 days. Changes status to 'cancelled' with an audit trail.

    This endpoint is designed to be called by Vercel Cron daily at 4 AM UTC.
    Requires CRON_SECRET for authentication.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=7)

    stmt = (
        select(Order)
        .where(
            Order.status.in_([OrderStatus.PENDING, OrderStatus.ASSIGNED]),
            Order.is_archived.is_(False),
            Order.created_at < cutoff,
        )
    )
    result = await db.execute(stmt)
    stale_orders = result.scalars().all()

    expired_count = 0
    for order in stale_orders:
        order.status = OrderStatus.CANCELLED
        order.notes = (order.notes + " | " if order.notes else "") + \
            "Auto-cancelled: stale order (7+ days without progress)"
        db.add(order)

        history = OrderStatusHistory(
            order_id=order.id,
            status=OrderStatus.CANCELLED,
            notes="Auto-cancelled: stale order (7+ days without progress)",
            timestamp=now,
        )
        db.add(history)
        expired_count += 1

    await db.commit()

    logger.info(f"[CRON] Auto-expire completed: {expired_count} stale orders cancelled")
    return {
        "success": True,
        "message": f"Cancelled {expired_count} stale orders",
        "expired_count": expired_count,
        "cutoff_date": cutoff.isoformat(),
        "timestamp": now.isoformat(),
    }


@router.post("/check-driver-shifts")
async def cron_check_driver_shifts(
    db: AsyncSession = Depends(deps.get_db),
    _: None = Depends(verify_cron_secret),
) -> Dict[str, Any]:
    """
    Send shift reminders to drivers who have been online for 10+ hours.

    Uses Redis-based throttling (1-hour TTL per driver) to prevent
    duplicate notifications within the same hour.

    This endpoint is designed to be called by Vercel Cron every hour.
    Requires CRON_SECRET for authentication.
    """
    import redis.asyncio as aioredis

    now = datetime.now(timezone.utc)
    threshold = timedelta(hours=10)

    # Find all available drivers with last_online_at set
    stmt = (
        select(Driver)
        .options(selectinload(Driver.user))
        .where(
            Driver.is_available.is_(True),
            Driver.last_online_at.isnot(None),
        )
    )
    result = await db.execute(stmt)
    drivers = result.scalars().all()

    notified_count = 0
    skipped_count = 0

    # Get Redis client for throttling
    redis_client = None
    try:
        redis_client = aioredis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )
    except Exception as e:
        logger.warning(f"[CRON] Redis unavailable for shift throttling: {e}")

    for driver in drivers:
        shift_duration = now - driver.last_online_at
        if shift_duration < threshold:
            continue

        hours_online = int(shift_duration.total_seconds() / 3600)

        # Throttle: check Redis key to avoid duplicate notifications
        throttle_key = f"shift_notif:{driver.id}:{now.strftime('%Y%m%d%H')}"
        if redis_client:
            try:
                already_sent = await redis_client.get(throttle_key)
                if already_sent:
                    skipped_count += 1
                    continue
            except Exception as e:
                logger.warning(f"[CRON] Redis throttle check failed: {e}")

        # Send notification
        if driver.user and driver.user.fcm_token:
            try:
                await notification_service.notify_driver_shift_limit(
                    driver.id, driver.user.fcm_token, hours=hours_online
                )
                notified_count += 1

                # Set throttle key with 1-hour TTL
                if redis_client:
                    try:
                        await redis_client.setex(throttle_key, 3600, "1")
                    except Exception as e:
                        logger.warning(f"[CRON] Redis throttle set failed: {e}")
            except Exception as e:
                logger.error(f"[CRON] Failed to notify driver {driver.id}: {e}")

    if redis_client:
        await redis_client.aclose()

    logger.info(
        f"[CRON] Shift check completed: {notified_count} notified, "
        f"{skipped_count} throttled"
    )
    return {
        "success": True,
        "message": f"Notified {notified_count} drivers, {skipped_count} throttled",
        "notified_count": notified_count,
        "skipped_count": skipped_count,
        "timestamp": now.isoformat(),
    }
