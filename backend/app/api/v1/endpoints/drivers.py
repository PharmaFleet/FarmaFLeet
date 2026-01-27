from typing import Any, List, Optional, Union
from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from geoalchemy2.elements import WKTElement

from app.api import deps
from app.models.driver import Driver
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.location import DriverLocation
from app.schemas.driver import (
    Driver as DriverSchema,
    DriverCreate,
    DriverUpdate,
    PaginatedDriverResponse,
)
import math

from app.schemas.order import Order as OrderSchema
from app.schemas.location import (
    DriverLocation as DriverLocationSchema,
    DriverLocationCreate,
)
from app.core.security import get_password_hash
from app.schemas.driver import DriverWithUserCreate

router = APIRouter()


@router.get("", response_model=PaginatedDriverResponse)
async def read_drivers(
    db: AsyncSession = Depends(deps.get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1),
    active_only: bool = False,
    warehouse_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve drivers with pagination.
    """
    skip = (page - 1) * size

    # Base query for counting and fetching
    base_query = select(Driver)
    if active_only:
        base_query = base_query.where(Driver.is_available)
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

    query = select(Order).where(Order.driver_id == driver.id)

    if status_filter:
        query = query.where(Order.status == status_filter)

    result = await db.execute(query)
    orders = result.scalars().all()
    return orders


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
    await db.refresh(driver)
    return driver


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
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    return driver


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
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


@router.get("/locations", response_model=List[Any])  # Need a schema for this
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

    query = (
        select(DriverLocation, Driver)
        .join(
            subquery,
            (DriverLocation.driver_id == subquery.c.driver_id)
            & (DriverLocation.timestamp == subquery.c.max_ts),
        )
        .join(Driver, DriverLocation.driver_id == Driver.id)
        .where(Driver.is_available == True)
    )

    result = await db.execute(query)
    rows = result.all()

    # Transform to simple format
    locations = []
    for loc, drv in rows:
        # Note: Handling Geometry to lat/lon requires attention.
        # Ideally, we cast to text in query or use a utility.
        # For now, simplistic return.

        # We need to extract coordinates from WKB/WKTElement if possible
        # Or use ST_X, ST_Y functions
        pass
        # Placeholder implementation - ideally query should select ST_X and ST_Y

    # Better query:
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
        .where(Driver.is_available == True)
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
