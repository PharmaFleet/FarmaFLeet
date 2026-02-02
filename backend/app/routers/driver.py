"""Driver router with location tracking endpoints."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    status,
)
from geoalchemy2.elements import WKTElement
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import redis.asyncio as redis

from app.api import deps
from app.core.config import settings
from app.models.driver import Driver
from app.models.location import DriverLocation
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.schemas.location import (
    DriverLocation as DriverLocationSchema,
)
from app.services.notification import notification_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Redis client for rate limiting
redis_client = redis.from_url(
    settings.REDIS_URL, encoding="utf-8", decode_responses=True
)


class LocationUpdate(BaseModel):
    """Location update model with validation."""

    latitude: float = Field(..., description="Latitude in degrees (-90 to 90)")
    longitude: float = Field(..., description="Longitude in degrees (-180 to 180)")
    accuracy: float | None = Field(None, ge=0, description="Accuracy radius in meters")
    heading: float | None = Field(
        None, ge=0, le=360, description="Heading in degrees (0-360)"
    )
    speed: float | None = Field(None, ge=0, description="Speed in meters/second")
    timestamp: datetime | None = Field(
        None, description="Timestamp of location reading (defaults to server time)"
    )

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        """Validate latitude range."""
        if not -90 <= v <= 90:
            raise ValueError("Latitude must be between -90 and 90 degrees")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        """Validate longitude range."""
        if not -180 <= v <= 180:
            raise ValueError("Longitude must be between -180 and 180 degrees")
        return v


@router.post("/location", response_model=DriverLocationSchema)
async def update_location(
    *,
    db: AsyncSession = Depends(deps.get_db),
    location_in: LocationUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update driver location with rate limiting.

    - Rate limited to 1 update per 5 seconds per driver
    - Stores location using PostGIS POINT geometry
    - Publishes update to Redis for WebSocket broadcast
    - Validates coordinate ranges
    """
    # Find driver profile for current user
    result = await db.execute(
        select(Driver)
        .where(Driver.user_id == current_user.id)
        .options(selectinload(Driver.user))
    )
    driver = result.scalars().first()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found",
        )

    # Check rate limiting: max 1 update per 5 seconds per driver
    rate_limit_key = f"location_rate_limit:{driver.id}"

    try:
        # Check if rate limit key exists (means update was made recently)
        exists = await redis_client.exists(rate_limit_key)
        if exists:
            # Get TTL to tell client when they can update again
            ttl = await redis_client.ttl(rate_limit_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {ttl} seconds",
            )

        # Set rate limit key with 5-second expiration
        await redis_client.setex(rate_limit_key, 5, "1")
    except redis.ConnectionError:
        # If Redis is down, log warning but allow the request
        logger.warning("Redis unavailable for rate limiting, allowing request")

    # Create point geometry using WKT format
    point_wkt = f"POINT({location_in.longitude} {location_in.latitude})"

    # Store location in database
    db_obj = DriverLocation(
        driver_id=driver.id,
        location=WKTElement(point_wkt, srid=4326),
        timestamp=location_in.timestamp or datetime.utcnow(),
    )
    db.add(db_obj)

    # Check for shift limit (12 hours) - send notification if needed
    if driver.is_available and driver.last_online_at:
        shift_duration = datetime.utcnow() - driver.last_online_at
        if shift_duration > timedelta(hours=12):
            if current_user.fcm_token:
                await notification_service.notify_driver_shift_limit(
                    driver.id, current_user.fcm_token
                )

    await db.commit()
    await db.refresh(db_obj)

    # Publish location update to Redis channel for WebSocket broadcast
    try:
        # Construct message matching frontend expectations:
        # { type: 'driver_location_update', data: { ... } }
        location_data = {
            "driver_id": driver.id,
            "driver_name": current_user.full_name,
            "vehicle_info": driver.vehicle_info,
            "latitude": location_in.latitude,
            "longitude": location_in.longitude,
            "accuracy": location_in.accuracy,
            "heading": location_in.heading,
            "speed": location_in.speed,
            "timestamp": db_obj.timestamp.isoformat(),
            "status": "online"
            if driver.is_available
            else "busy",  # Map to frontend status enum
            "is_available": driver.is_available,
        }

        message = {"type": "driver_location_update", "data": location_data}

        await redis_client.publish("driver_locations", json.dumps(message))
        logger.debug(f"Published location update for driver {driver.id} to Redis")
    except redis.ConnectionError:
        logger.warning(
            f"Redis unavailable, could not publish location for driver {driver.id}"
        )
    except Exception as e:
        logger.error(f"Failed to publish location update: {e}")

    return db_obj


@router.get("/me", response_model=dict)
async def get_driver_profile(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current driver's complete profile with latest location.
    """
    result = await db.execute(
        select(Driver)
        .where(Driver.user_id == current_user.id)
        .options(selectinload(Driver.user), selectinload(Driver.warehouse))
    )
    driver = result.scalars().first()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found",
        )

    # Get latest location
    location_result = await db.execute(
        select(DriverLocation)
        .where(DriverLocation.driver_id == driver.id)
        .order_by(DriverLocation.timestamp.desc())
        .limit(1)
    )
    latest_location = location_result.scalars().first()

    # Get active orders count
    orders_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.driver_id == driver.id,
            Order.status.in_(
                [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT]
            ),
        )
    )
    active_orders_count = orders_result.scalar_one()

    return {
        "id": driver.id,
        "user_id": driver.user_id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "vehicle_info": driver.vehicle_info,
        "biometric_id": driver.biometric_id,
        "is_available": driver.is_available,
        "last_online_at": driver.last_online_at,
        "warehouse": (
            {
                "id": driver.warehouse.id,
                "name": driver.warehouse.name,
                "code": driver.warehouse.code,
            }
            if driver.warehouse
            else None
        ),
        "location": (
            {
                "latitude": latest_location.latitude,
                "longitude": latest_location.longitude,
                "timestamp": latest_location.timestamp,
            }
            if latest_location
            else None
        ),
        "active_orders_count": active_orders_count,
    }


@router.patch("/status", response_model=dict)
async def update_driver_status(
    is_available: bool = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update driver's online/offline status.
    """
    result = await db.execute(
        select(Driver)
        .where(Driver.user_id == current_user.id)
        .options(selectinload(Driver.user))
    )
    driver = result.scalars().first()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found",
        )

    driver.is_available = is_available
    if is_available:
        driver.last_online_at = datetime.utcnow()

    db.add(driver)
    await db.commit()
    await db.refresh(driver)

    logger.info(
        f"Driver {driver.id} status updated to {'online' if is_available else 'offline'}"
    )

    # Broadcast status change via Redis
    try:
        # Construct message matching frontend expectations:
        # { type: 'driver_status_change', data: { ... } }
        status_data = {
            "driver_id": driver.id,
            "driver_name": current_user.full_name,
            "status": "online" if is_available else "offline",
            "is_available": is_available,
            "timestamp": datetime.utcnow().isoformat(),
        }

        message = {"type": "driver_status_change", "data": status_data}

        await redis_client.publish("driver_locations", json.dumps(message))
    except Exception as e:
        logger.warning(f"Could not broadcast status change: {e}")

    return {
        "id": driver.id,
        "is_available": driver.is_available,
        "last_online_at": driver.last_online_at,
    }
