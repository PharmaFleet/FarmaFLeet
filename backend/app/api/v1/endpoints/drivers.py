from typing import Any, List, Optional
from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    status,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, desc
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
    DriverDetail,
)
from app.schemas.order import Order as OrderSchema
from app.schemas.location import (
    DriverLocation as DriverLocationSchema,
    DriverLocationCreate,
)

router = APIRouter()


@router.get("", response_model=List[DriverSchema])
async def read_drivers(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    warehouse_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve drivers.
    """
    # Authorization: Admins, Managers, Dispatchers
    # Warehouse managers can only see their warehouse drivers

    query = select(Driver).join(Driver.user)

    if active_only:
        query = query.where(Driver.is_available == True)

    if warehouse_id:
        query = query.where(Driver.warehouse_id == warehouse_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    drivers = result.scalars().all()
    return drivers


@router.post("/", response_model=DriverSchema)
async def create_driver(
    *,
    db: AsyncSession = Depends(deps.get_db),
    driver_in: DriverCreate,
    current_user: User = Depends(deps.get_current_active_superuser),  # Only admins
) -> Any:
    """
    Create new driver profile.
    """
    # Check if user exists
    user = await db.get(User, driver_in.user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Check if driver profile already exists
    result = await db.execute(select(Driver).where(Driver.user_id == driver_in.user_id))
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Driver profile already exists for this user",
        )

    db_obj = Driver(
        user_id=driver_in.user_id,
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
