from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from geoalchemy2.elements import WKTElement
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import redis.asyncio as aioredis

from app.api import deps
from app.models.driver import Driver
from app.models.location import DriverLocation
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.warehouse import Warehouse
from app.schemas.driver import (
    Driver as DriverSchema,
    DriverCreate,
    DriverUpdate,
    DriverWithUserCreate,
    PaginatedDriverResponse,
)
from app.schemas.user import User as UserSchema
from app.schemas.warehouse import Warehouse as WarehouseSchema
from app.schemas.location import (
    DriverLocation as DriverLocationSchema,
    DriverLocationCreate,
    DriverLocationResponse,
)
from app.schemas.order import Order as OrderSchema
from app.core.security import get_password_hash
from app.services.notification import notification_service
from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis client for publishing location updates
_redis_client: aioredis.Redis | None = None


async def get_redis_publisher() -> aioredis.Redis:
    """Get or create Redis client for publishing."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )
    return _redis_client

router = APIRouter()


@router.get("", response_model=PaginatedDriverResponse)
async def read_drivers(
    db: AsyncSession = Depends(deps.get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1),
    active_only: bool = False,
    status: Optional[str] = None,
    search: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve drivers with pagination.
    """
    skip = (page - 1) * size

    # Base query for counting and fetching
    base_query = select(Driver)

    # Apply search filter if provided
    if search:
        base_query = base_query.join(Driver.user, isouter=True).where(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                Driver.vehicle_info.ilike(f"%{search}%"),
            )
        )

    # Status filter logic
    if active_only or status == "online":
        base_query = base_query.where(Driver.is_available.is_(True))
    elif status == "offline":
        base_query = base_query.where(Driver.is_available.is_(False))

    if warehouse_id:
        base_query = base_query.where(Driver.warehouse_id == warehouse_id)

    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    query = (
        base_query.options(selectinload(Driver.user), selectinload(Driver.warehouse))
        .offset(skip)
        .limit(size)
    )

    result = await db.execute(query)
    drivers = result.scalars().all()

    pages = math.ceil(total / size) if total > 0 else 1

    return {
        "items": drivers,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/me", response_model=DriverSchema)
async def read_driver_me(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current driver profile.
    """
    try:
        # 1. Get Driver
        result = await db.execute(
            select(Driver).where(Driver.user_id == current_user.id)
        )
        driver = result.scalars().first()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # 2. Fetch warehouse manually if assigned
        warehouse = None
        if driver.warehouse_id:
            warehouse = await db.get(Warehouse, driver.warehouse_id)

        # 3. Compute stats
        total_deliveries_result = await db.execute(
            select(func.count(Order.id)).where(
                Order.driver_id == driver.id, Order.status == OrderStatus.DELIVERED
            )
        )
        total_deliveries = total_deliveries_result.scalar_one()

        # 4. Manual Schema Construction
        # Instead of modifying the ORM objects (which triggers async errors),
        # we construct the response schema explicitly.

        # Convert driver model to dict/Pydantic model first to get base fields
        # verify what attributes DriverSchema expects.
        # It expects user and warehouse fields if we look at schemas/driver.py

        # We use explicit construction to ensure safety
        # Build UserSchema explicitly to avoid lazy loading driver_profile
        user_schema = UserSchema(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            is_active=current_user.is_active,
            is_superuser=current_user.is_superuser,
            role=current_user.role,
            fcm_token=current_user.fcm_token,
            phone=current_user.phone,
        )

        # Build WarehouseSchema explicitly if warehouse exists
        warehouse_schema = None
        if warehouse:
            warehouse_schema = WarehouseSchema(
                id=warehouse.id,
                code=warehouse.code,
                name=warehouse.name,
                latitude=warehouse.latitude,
                longitude=warehouse.longitude,
            )

        return DriverSchema(
            id=driver.id,
            user_id=driver.user_id,
            vehicle_info=driver.vehicle_info,
            biometric_id=driver.biometric_id,
            warehouse_id=driver.warehouse_id,
            is_available=driver.is_available,
            user=user_schema,
            warehouse=warehouse_schema,
            total_deliveries=total_deliveries,
        )

    except Exception as e:
        logger.error(f"Error fetching driver profile: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error loading profile: {str(e)}")


@router.get("/me/orders", response_model=List[OrderSchema])
async def read_driver_me_orders(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get orders assigned to the current logged-in driver.
    """
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    query = (
        select(Order)
        .where(Order.driver_id == driver.id)
        .options(
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.driver).selectinload(Driver.warehouse),
            selectinload(Order.warehouse),
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
        )
    )

    if status_filter:
        query = query.where(Order.status == status_filter)

    result = await db.execute(query)
    orders = result.scalars().all()
    return orders


@router.get("/me/stats")
async def read_driver_me_stats(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Get current driver's statistics including deliveries, earnings, and performance.
    Returns:
    - total_deliveries: Total number of delivered orders
    - today_deliveries: Deliveries completed today
    - total_earnings: Total earnings from all delivered orders (commission-based)
    - today_earnings: Today's earnings
    - average_rating: Driver rating (placeholder - not yet implemented)
    - on_time_rate: Percentage of on-time deliveries (placeholder - not yet implemented)
    - active_orders: Current number of active orders
    """
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total delivered orders
    total_deliveries_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.driver_id == driver.id,
            Order.status == OrderStatus.DELIVERED,
        )
    )
    total_deliveries = total_deliveries_result.scalar_one()

    # Today's deliveries (orders delivered today based on delivered_at)
    today_deliveries_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.driver_id == driver.id,
            Order.status == OrderStatus.DELIVERED,
            Order.delivered_at >= today_start,
        )
    )
    today_deliveries = today_deliveries_result.scalar_one()

    # Total earnings - using a fixed commission rate of 1.0 KWD per delivery
    # In a real system, this would be configurable or stored per-order
    commission_per_delivery = 1.0
    total_earnings = total_deliveries * commission_per_delivery

    # Today's earnings
    today_earnings = today_deliveries * commission_per_delivery

    # Active orders (assigned, picked_up, in_transit, out_for_delivery)
    active_orders_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.driver_id == driver.id,
            Order.status.in_([
                OrderStatus.ASSIGNED,
                OrderStatus.PICKED_UP,
                OrderStatus.IN_TRANSIT,
                OrderStatus.OUT_FOR_DELIVERY,
            ]),
        )
    )
    active_orders = active_orders_result.scalar_one()

    # Placeholder values for rating and on-time rate
    # These would need additional data tracking to calculate properly
    average_rating = 5.0  # Default perfect rating
    on_time_rate = 100.0  # Percentage

    return {
        "driver_id": driver.id,
        "total_deliveries": total_deliveries,
        "today_deliveries": today_deliveries,
        "total_earnings": total_earnings,
        "today_earnings": today_earnings,
        "average_rating": average_rating,
        "on_time_rate": on_time_rate,
        "active_orders": active_orders,
    }


@router.patch("/me/status", response_model=DriverSchema)
async def update_driver_me_status(
    is_available: bool = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update current driver's availability status.
    """
    result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    driver.is_available = is_available
    if is_available:
        driver.last_online_at = datetime.now(timezone.utc)
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    logger.info(
        f"Driver {driver.id} status updated to {is_available}, last_online_at: {driver.last_online_at}"
    )

    # Fetch warehouse manually to avoid lazy loading
    warehouse = None
    if driver.warehouse_id:
        warehouse = await db.get(Warehouse, driver.warehouse_id)

    # Build schemas explicitly to avoid lazy loading driver_profile on User
    user_schema = UserSchema(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        role=current_user.role,
        fcm_token=current_user.fcm_token,
        phone=current_user.phone,
    )

    warehouse_schema = None
    if warehouse:
        warehouse_schema = WarehouseSchema(
            id=warehouse.id,
            code=warehouse.code,
            name=warehouse.name,
            latitude=warehouse.latitude,
            longitude=warehouse.longitude,
        )

    return DriverSchema(
        id=driver.id,
        user_id=driver.user_id,
        vehicle_info=driver.vehicle_info,
        biometric_id=driver.biometric_id,
        warehouse_id=driver.warehouse_id,
        is_available=driver.is_available,
        user=user_schema,
        warehouse=warehouse_schema,
    )


@router.post("/me/fcm-token")
async def update_fcm_token(
    token: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, str]:
    """
    Update current user's FCM token.
    """
    current_user.fcm_token = token
    db.add(current_user)
    await db.commit()
    return {"msg": "FCM token updated successfully"}


@router.post("", response_model=DriverSchema)
async def create_driver(
    *,
    db: AsyncSession = Depends(deps.get_db),
    driver_in: Union[DriverCreate, DriverWithUserCreate],
    current_user: User = Depends(deps.get_current_active_superuser),  # Only admins
) -> Any:
    """
    Create new driver profile, optionally creating a new user account atomically.
    """
    user_id = getattr(driver_in, "user_id", None)

    # Flow 1: Atomic creation of User + Driver
    if isinstance(driver_in, DriverWithUserCreate):
        # Check if email is available
        stmt = select(User).where(User.email == driver_in.email)
        res = await db.execute(stmt)
        if res.scalars().first():
            raise HTTPException(
                status_code=400, detail="User with this email already exists"
            )

        # Create User
        new_user = User(
            email=driver_in.email,
            full_name=driver_in.full_name,
            hashed_password=get_password_hash(driver_in.password),
            role="driver",
            is_active=True,
        )
        db.add(new_user)
        await db.flush()  # Get the user ID
        user_id = new_user.id

    # Flow 2: Use existing User ID
    elif user_id:
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    else:
        raise HTTPException(
            status_code=400, detail="Either user_id or user details must be provided"
        )

    # Check if driver profile already exists
    result = await db.execute(select(Driver).where(Driver.user_id == user_id))
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Driver profile already exists for this user",
        )

    db_obj = Driver(
        user_id=user_id,
        vehicle_info=driver_in.vehicle_info,
        vehicle_type=driver_in.vehicle_type,
        biometric_id=driver_in.biometric_id,
        code=driver_in.code or driver_in.biometric_id,
        warehouse_id=driver_in.warehouse_id,
        is_available=driver_in.is_available,
    )
    db.add(db_obj)
    await db.commit()

    # Re-fetch with eager loading for relationships
    result = await db.execute(
        select(Driver)
        .where(Driver.id == db_obj.id)
        .options(selectinload(Driver.user), selectinload(Driver.warehouse))
    )
    return result.scalars().first()


@router.post("/location", response_model=DriverLocationSchema)
async def update_location(
    *,
    db: AsyncSession = Depends(deps.get_db),
    location_in: DriverLocationCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update driver location.
    """
    # Find driver profile for current user
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalars().first()

    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    # Create point geometry
    point = f"POINT({location_in.longitude} {location_in.latitude})"

    db_obj = DriverLocation(driver_id=driver.id, location=WKTElement(point, srid=4326))
    db.add(db_obj)

    # Check for shift limit (12 hours)
    if driver.is_available and driver.last_online_at:
        shift_duration = datetime.now(timezone.utc) - driver.last_online_at
        if shift_duration > timedelta(hours=12):
            # We should probably only notify once or throttle this.
            # For now, we rely on the mobile app to handle duplicate alerts or user to toggle offline.
            if current_user.fcm_token:
                await notification_service.notify_driver_shift_limit(
                    driver.id, current_user.fcm_token
                )

    await db.commit()
    await db.refresh(db_obj)

    # Publish location update to Redis for real-time WebSocket broadcast
    try:
        redis_client = await get_redis_publisher()
        message = json.dumps({
            "type": "driver_location_update",
            "data": {
                "driver_id": driver.id,
                "latitude": location_in.latitude,
                "longitude": location_in.longitude,
                "heading": location_in.heading,
                "speed": location_in.speed,
            }
        })
        await redis_client.publish("driver_locations", message)
        logger.info(f"Published location update for driver {driver.id} to Redis")
    except Exception as e:
        # Log but don't fail the request if Redis publish fails
        logger.error(f"Failed to publish location to Redis: {e}")

    return db_obj


@router.get("/locations", response_model=List[dict])
async def get_driver_locations(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> List[Dict[str, Any]]:
    """
    Get latest location of all online drivers.
    """
    # This might require a complex query to get latest location per driver
    subquery = (
        select(
            DriverLocation.driver_id, func.max(DriverLocation.timestamp).label("max_ts")
        )
        .group_by(DriverLocation.driver_id)
        .subquery()
    )

    query_geo = (
        select(
            Driver.id,
            Driver.vehicle_info,
            func.ST_X(DriverLocation.location).label("lng"),
            func.ST_Y(DriverLocation.location).label("lat"),
            DriverLocation.timestamp,
        )
        .join(
            subquery,
            (DriverLocation.driver_id == subquery.c.driver_id)
            & (DriverLocation.timestamp == subquery.c.max_ts),
        )
        .join(Driver, DriverLocation.driver_id == Driver.id)
        .where(Driver.is_available)
    )

    result_geo = await db.execute(query_geo)
    locations_data = []
    for row in result_geo:
        locations_data.append(
            {
                "driver_id": row.id,
                "vehicle_info": row.vehicle_info,
                "latitude": row.lat,
                "longitude": row.lng,
                "timestamp": row.timestamp,
            }
        )

    return locations_data


@router.get("/{driver_id}", response_model=DriverSchema)
async def read_driver(
    driver_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get driver by ID.
    """
    # Use select with eager loading for relationships
    result = await db.execute(
        select(Driver)
        .where(Driver.id == driver_id)
        .options(selectinload(Driver.user), selectinload(Driver.warehouse))
    )
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


@router.get("/{driver_id}/stats")
async def read_driver_stats(
    driver_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Get driver statistics.
    Returns orders_assigned, orders_delivered, last_order_assigned_at, online_duration_minutes.
    """
    # Verify driver exists
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Count total orders assigned to this driver
    orders_assigned_result = await db.execute(
        select(func.count(Order.id)).where(Order.driver_id == driver_id)
    )
    orders_assigned = orders_assigned_result.scalar_one()

    # Count delivered orders
    orders_delivered_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.driver_id == driver_id, Order.status == OrderStatus.DELIVERED
        )
    )
    orders_delivered = orders_delivered_result.scalar_one()

    # Get last order assigned timestamp (using updated_at of most recent order)
    last_order_result = await db.execute(
        select(func.max(Order.updated_at)).where(Order.driver_id == driver_id)
    )
    last_order_assigned_at = last_order_result.scalar_one()

    # Calculate online duration (time since last_online_at if available and driver is online)
    online_duration_minutes = None
    if driver.is_available and driver.last_online_at:
        duration = datetime.now(timezone.utc) - driver.last_online_at
        online_duration_minutes = int(duration.total_seconds() / 60)

    return {
        "driver_id": driver_id,
        "orders_assigned": orders_assigned,
        "orders_delivered": orders_delivered,
        "last_order_assigned_at": last_order_assigned_at.isoformat() if last_order_assigned_at else None,
        "online_duration_minutes": online_duration_minutes,
        "is_available": driver.is_available,
    }


@router.put("/{driver_id}", response_model=DriverSchema)
async def update_driver(
    *,
    db: AsyncSession = Depends(deps.get_db),
    driver_id: int,
    driver_in: DriverUpdate,
    current_user: User = Depends(deps.get_current_manager_or_above),
) -> Any:
    """
    Update a driver.
    Manager or admin only.
    """
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    update_data = driver_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(driver, field, value)

    db.add(driver)
    await db.commit()

    # Re-fetch with relationships for response
    result = await db.execute(
        select(Driver)
        .where(Driver.id == driver_id)
        .options(selectinload(Driver.user), selectinload(Driver.warehouse))
    )
    return result.scalars().first()


@router.patch("/{driver_id}/status", response_model=DriverSchema)
async def update_driver_status(
    *,
    db: AsyncSession = Depends(deps.get_db),
    driver_id: int,
    is_available: bool = Body(..., embed=True),
    current_user: User = Depends(deps.get_current_dispatcher_or_above),
) -> Any:
    """
    Update driver availability status.
    Dispatcher, manager, or admin only.
    """
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver.is_available = is_available
    if is_available:
        driver.last_online_at = datetime.now(timezone.utc)
    db.add(driver)
    await db.commit()

    # Re-fetch with relationships for response
    result = await db.execute(
        select(Driver)
        .where(Driver.id == driver_id)
        .options(selectinload(Driver.user), selectinload(Driver.warehouse))
    )
    return result.scalars().first()


@router.get("/{driver_id}/orders")
async def read_driver_orders(
    driver_id: int,
    status_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Get orders assigned to a driver with pagination.
    """
    base_query = select(Order).where(Order.driver_id == driver_id)

    if status_filter:
        base_query = base_query.where(Order.status == status_filter)

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    # Fetch page
    skip = (page - 1) * size
    query = (
        base_query
        .options(
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
            selectinload(Order.warehouse),
        )
        .order_by(desc(Order.updated_at))
        .offset(skip)
        .limit(size)
    )

    result = await db.execute(query)
    orders = result.scalars().all()

    pages = math.ceil(total / size) if total > 0 else 1

    return {
        "items": orders,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/{driver_id}/delivery-history", response_model=List[OrderSchema])
async def read_driver_delivery_history(
    driver_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get driver delivery history.
    """
    query = (
        select(Order)
        .where(
            Order.driver_id == driver_id,
            Order.status.in_(
                [OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.REJECTED]
            ),
        )
        .order_by(desc(Order.updated_at))
        .offset(skip)
        .limit(limit)
        .options(
            selectinload(Order.driver),
            selectinload(Order.warehouse),
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
        )
    )

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{driver_id}/location-history")
async def read_driver_location_history(
    driver_id: int,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> List[Dict[str, Any]]:
    """
    Get driver location history.
    """
    query = (
        select(
            func.ST_X(DriverLocation.location).label("lng"),
            func.ST_Y(DriverLocation.location).label("lat"),
            DriverLocation.timestamp,
        )
        .where(DriverLocation.driver_id == driver_id)
        .order_by(desc(DriverLocation.timestamp))
        .limit(limit)
    )
    result = await db.execute(query)
    history = []
    for row in result:
        history.append(
            {"latitude": row.lat, "longitude": row.lng, "timestamp": row.timestamp}
        )
    return history


@router.delete("/{driver_id}")
async def delete_driver(
    driver_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Dict[str, str]:
    """
    Delete a driver.
    Admin only. Cannot delete drivers with active (non-delivered/non-cancelled) orders.
    """
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Check for active orders assigned to this driver
    active_statuses = [
        OrderStatus.PENDING,
        OrderStatus.ASSIGNED,
        OrderStatus.PICKED_UP,
        OrderStatus.IN_TRANSIT,
    ]
    result = await db.execute(
        select(Order)
        .where(Order.driver_id == driver_id)
        .where(Order.status.in_(active_statuses))
        .limit(1)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete driver with active orders. Reassign or complete orders first.",
        )

    # Delete driver profile
    await db.delete(driver)
    await db.commit()
    return {"msg": f"Driver {driver_id} deleted successfully"}


@router.websocket("/ws/location-updates")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Simple echo or broadcast logic
            # In a real app, this would receive location updates and broadcast to dashboards
            await manager.broadcast(f"Location update: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
