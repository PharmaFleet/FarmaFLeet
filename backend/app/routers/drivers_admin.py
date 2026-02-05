"""Admin drivers router with geospatial filtering capabilities."""

from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.driver import Driver
from app.models.location import DriverLocation
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.warehouse import Warehouse

logger = logging.getLogger(__name__)

router = APIRouter()


class DriverWithLocation(BaseModel):
    """Driver response with location data."""

    id: int
    user_id: int
    full_name: str
    email: str
    vehicle_info: str | None = None
    biometric_id: str | None = None
    is_available: bool
    last_online_at: datetime | None = None
    warehouse_id: int | None = None
    warehouse_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    location_timestamp: datetime | None = None
    active_orders_count: int = 0
    distance_from_center: float | None = Field(
        None, description="Distance from search center in kilometers"
    )

    model_config = ConfigDict(from_attributes=True)


class PaginatedDriverWithLocationResponse(BaseModel):
    """Paginated response with drivers and location data."""

    items: List[DriverWithLocation]
    total: int
    page: int
    size: int
    pages: int


@router.get("", response_model=PaginatedDriverWithLocationResponse)
async def get_drivers_with_locations(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(
        None, description="Filter by status: 'online', 'offline', or 'all'"
    ),
    warehouse_id: Optional[int] = Query(
        None, description="Filter by assigned warehouse ID"
    ),
    center_lat: Optional[float] = Query(
        None, ge=-90, le=90, description="Center latitude for radius search"
    ),
    center_lon: Optional[float] = Query(
        None, ge=-180, le=180, description="Center longitude for radius search"
    ),
    radius_km: float = Query(
        10.0, ge=0.1, le=100, description="Search radius in kilometers"
    ),
    hours_since_update: int = Query(
        24, ge=1, description="Only return drivers with updates within this many hours"
    ),
) -> Any:
    """
    Get drivers with geospatial filtering and location data.

    **Query Parameters:**
    - `status`: Filter by availability ('online', 'offline', 'all')
    - `warehouse_id`: Filter by assigned warehouse
    - `center_lat` + `center_lon` + `radius_km`: Geospatial filter
    - `hours_since_update`: Only include recently updated drivers (default: 24h)

    **PostGIS Features:**
    - Uses ST_SetSRID/ST_MakePoint for geometry operations
    - Uses ST_DWithin for efficient radius queries
    - Extracts latitude/longitude from POINT geometry

    **Response includes:**
    - Driver profile information
    - Current location (latitude, longitude)
    - Distance from search center (when provided)
    - Active orders count per driver
    """
    # Calculate time threshold
    time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours_since_update)

    # Build base query for latest location per driver
    # Using a subquery to get the most recent location for each driver
    latest_location_subquery = (
        select(
            DriverLocation.driver_id,
            func.max(DriverLocation.timestamp).label("max_ts"),
        )
        .where(DriverLocation.timestamp >= time_threshold)
        .group_by(DriverLocation.driver_id)
        .subquery()
    )

    # Build main query using PostGIS for location extraction
    # ST_X extracts longitude, ST_Y extracts latitude from POINT
    base_query = (
        select(
            Driver,
            User.full_name,
            User.email,
            Warehouse.name.label("warehouse_name"),
            func.ST_Y(DriverLocation.location).label("latitude"),
            func.ST_X(DriverLocation.location).label("longitude"),
            DriverLocation.timestamp.label("location_timestamp"),
        )
        .join(User, Driver.user_id == User.id)
        .outerjoin(Warehouse, Driver.warehouse_id == Warehouse.id)
        .outerjoin(
            latest_location_subquery,
            Driver.id == latest_location_subquery.c.driver_id,
        )
        .outerjoin(
            DriverLocation,
            (DriverLocation.driver_id == latest_location_subquery.c.driver_id)
            & (DriverLocation.timestamp == latest_location_subquery.c.max_ts),
        )
    )

    # Apply status filter
    if status == "online":
        base_query = base_query.where(Driver.is_available.is_(True))
    elif status == "offline":
        base_query = base_query.where(Driver.is_available.is_(False))

    # Apply warehouse filter
    if warehouse_id:
        base_query = base_query.where(Driver.warehouse_id == warehouse_id)

    # Apply geospatial filter if center coordinates provided
    if center_lat is not None and center_lon is not None:
        # Use PostGIS ST_DWithin for efficient radius query
        # Create a point from center coordinates
        center_point = f"POINT({center_lon} {center_lat})"

        # ST_DWithin uses meters, so convert km to meters
        radius_meters = radius_km * 1000

        # Add spatial filter using text() for raw SQL with PostGIS functions
        spatial_filter = text(
            f"ST_DWithin(DriverLocation.location::geometry, "
            f"ST_SetSRID(ST_MakePoint(:center_lon, :center_lat), 4326)::geometry, "
            f":radius_meters)"
        )
        base_query = base_query.where(spatial_filter)
        base_query = base_query.params(
            center_lon=center_lon,
            center_lat=center_lat,
            radius_meters=radius_meters,
        )

    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    # Add pagination
    skip = (page - 1) * size
    query = base_query.offset(skip).limit(size)

    result = await db.execute(query)
    rows = result.all()

    # Process results and calculate distances
    drivers_with_locations = []
    driver_ids = [row.Driver.id for row in rows]

    # Get active orders count for all drivers in one query
    if driver_ids:
        orders_query = (
            select(
                Order.driver_id,
                func.count(Order.id).label("active_count"),
            )
            .where(
                Order.driver_id.in_(driver_ids),
                Order.status.in_(
                    [
                        OrderStatus.ASSIGNED,
                        OrderStatus.PICKED_UP,
                        OrderStatus.IN_TRANSIT,
                    ]
                ),
            )
            .group_by(Order.driver_id)
        )
        orders_result = await db.execute(orders_query)
        active_orders_map = {row.driver_id: row.active_count for row in orders_result}
    else:
        active_orders_map = {}

    for row in rows:
        driver = row.Driver
        latitude = row.latitude
        longitude = row.longitude

        # Calculate distance from center if coordinates provided
        distance = None
        if center_lat is not None and center_lon is not None:
            if latitude and longitude:
                # Calculate distance using Haversine formula
                distance = calculate_distance_haversine(
                    center_lat, center_lon, latitude, longitude
                )
            # Only include drivers within radius
            if distance and distance > radius_km:
                continue

        driver_data = DriverWithLocation(
            id=driver.id,
            user_id=driver.user_id,
            full_name=row.full_name,
            email=row.email,
            vehicle_info=driver.vehicle_info,
            biometric_id=driver.biometric_id,
            is_available=driver.is_available,
            last_online_at=driver.last_online_at,
            warehouse_id=driver.warehouse_id,
            warehouse_name=row.warehouse_name,
            latitude=latitude,
            longitude=longitude,
            location_timestamp=row.location_timestamp,
            active_orders_count=active_orders_map.get(driver.id, 0),
            distance_from_center=distance,
        )
        drivers_with_locations.append(driver_data)

    # Recalculate total after distance filtering
    total_filtered = len(drivers_with_locations)
    pages = math.ceil(total_filtered / size) if total_filtered > 0 else 1

    return {
        "items": drivers_with_locations,
        "total": total_filtered,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/map-data")
async def get_drivers_for_map(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    bounds_north: float = Query(..., ge=-90, le=90, description="Northern bound"),
    bounds_south: float = Query(..., ge=-90, le=90, description="Southern bound"),
    bounds_east: float = Query(..., ge=-180, le=180, description="Eastern bound"),
    bounds_west: float = Query(..., ge=-180, le=180, description="Western bound"),
) -> Any:
    """
    Get driver locations within map bounds for display.

    Optimized for map display - returns lightweight data for many drivers.
    """
    # Ensure bounds are valid
    if bounds_north < bounds_south:
        bounds_north, bounds_south = bounds_south, bounds_north
    if bounds_east < bounds_west:
        bounds_east, bounds_west = bounds_west, bounds_east

    # Get latest location per driver within bounds
    # Use raw SQL for PostGIS bounding box query (ST_MakeEnvelope)
    query = text(
        """
        SELECT 
            d.id,
            u.full_name,
            d.vehicle_info,
            d.is_available,
            ST_Y(dl.location) as latitude,
            ST_X(dl.location) as longitude,
            dl.timestamp as location_timestamp,
            w.name as warehouse_name
        FROM driver d
        JOIN "user" u ON d.user_id = u.id
        LEFT JOIN warehouse w ON d.warehouse_id = w.id
        INNER JOIN (
            SELECT driver_id, MAX(timestamp) as max_ts
            FROM driver_location
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
            GROUP BY driver_id
        ) latest ON d.id = latest.driver_id
        INNER JOIN driver_location dl 
            ON d.id = dl.driver_id 
            AND dl.timestamp = latest.max_ts
        WHERE ST_Within(
            dl.location::geometry,
            ST_MakeEnvelope(:west, :south, :east, :north, 4326)
        )
        AND d.is_available = TRUE
    """
    )

    result = await db.execute(
        query,
        {
            "west": bounds_west,
            "south": bounds_south,
            "east": bounds_east,
            "north": bounds_north,
        },
    )

    drivers = []
    for row in result:
        drivers.append(
            {
                "id": row.id,
                "name": row.full_name,
                "vehicle_info": row.vehicle_info,
                "is_available": row.is_available,
                "latitude": row.latitude,
                "longitude": row.longitude,
                "last_updated": row.location_timestamp.isoformat()
                if row.location_timestamp
                else None,
                "warehouse": row.warehouse_name,
            }
        )

    return {
        "drivers": drivers,
        "count": len(drivers),
        "bounds": {
            "north": bounds_north,
            "south": bounds_south,
            "east": bounds_east,
            "west": bounds_west,
        },
    }


def calculate_distance_haversine(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate distance between two points using Haversine formula.

    Args:
        lat1, lon1: First point coordinates
        lat2, lon2: Second point coordinates

    Returns:
        Distance in kilometers
    """
    # Earth's radius in kilometers
    R = 6371.0

    # Convert to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    # Differences
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    # Haversine formula
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c

    return round(distance, 2)
