from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta
from typing import Any, List, Optional, Union

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from geoalchemy2.elements import WKTElement
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.driver import Driver
from app.models.location import DriverLocation
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.schemas.driver import (
    Driver as DriverSchema,
    DriverCreate,
    DriverUpdate,
    DriverWithUserCreate,
    PaginatedDriverResponse,
)
from app.schemas.location import (
    DriverLocation as DriverLocationSchema,
    DriverLocationCreate,
    DriverLocationResponse,
)
from app.schemas.order import Order as OrderSchema
from app.core.security import get_password_hash
from app.services.notification import notification_service

logger = logging.getLogger(__name__)

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
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    return driver


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
            selectinload(Order.driver),
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
        select(Driver)
        .where(Driver.user_id == current_user.id)
        .options(selectinload(Driver.user), selectinload(Driver.warehouse))
    )
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    driver.is_available = is_available
    if is_available:
        driver.last_online_at = datetime.utcnow()
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    print(
        f"Driver {driver.id} status updated to {is_available}, last_online_at: {driver.last_online_at}"
    )
    return driver


@router.post("/me/fcm-token")
async def update_fcm_token(
    token: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
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
        biometric_id=driver_in.biometric_id,
        warehouse_id=driver_in.warehouse_id,
        is_available=driver_in.is_available,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


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
        shift_duration = datetime.utcnow() - driver.last_online_at
        if shift_duration > timedelta(hours=12):
            # We should probably only notify once or throttle this.
            # For now, we rely on the mobile app to handle duplicate alerts or user to toggle offline.
            if current_user.fcm_token:
                await notification_service.notify_driver_shift_limit(
                    driver.id, current_user.fcm_token
                )

    await db.commit()
    await db.refresh(db_obj)
    return db_obj


@router.get("/locations", response_model=List[dict])
async def get_driver_locations(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
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


@router.put("/{driver_id}", response_model=DriverSchema)
async def update_driver(
    *,
    db: AsyncSession = Depends(deps.get_db),
    driver_id: int,
    driver_in: DriverUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a driver.
    """
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    update_data = driver_in.dict(exclude_unset=True)
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
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update driver availability status.
    """
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver.is_available = is_available
    if is_available:
        driver.last_online_at = datetime.utcnow()
    db.add(driver)
    await db.commit()

    # Re-fetch with relationships for response
    result = await db.execute(
        select(Driver)
        .where(Driver.id == driver_id)
        .options(selectinload(Driver.user), selectinload(Driver.warehouse))
    )
    return result.scalars().first()


@router.get("/{driver_id}/orders", response_model=List[OrderSchema])
async def read_driver_orders(
    driver_id: int,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get orders assigned to a driver.
    """
    query = select(Order).where(Order.driver_id == driver_id)

    if status_filter:
        query = query.where(Order.status == status_filter)

    result = await db.execute(query)
    orders = result.scalars().all()
    return orders


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
) -> Any:
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


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


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
