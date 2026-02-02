from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.elements import WKTElement

from app.api import deps
from app.models.warehouse import Warehouse
from app.models.user import User
from app.schemas.warehouse import (
    Warehouse as WarehouseSchema,
    WarehouseCreate,
    WarehouseUpdate,
)

router = APIRouter()


@router.get("", response_model=List[WarehouseSchema])
async def read_warehouses(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve warehouses.
    All authenticated users can view warehouses.
    """
    result = await db.execute(select(Warehouse).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{warehouse_id}", response_model=WarehouseSchema)
async def read_warehouse(
    warehouse_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get warehouse by ID.
    All authenticated users can view warehouse details.
    """
    warehouse = await db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse


@router.post("", response_model=WarehouseSchema)
async def create_warehouse(
    *,
    db: AsyncSession = Depends(deps.get_db),
    warehouse_in: WarehouseCreate,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Create new warehouse.
    Admin only.
    """
    # Check if warehouse code already exists
    result = await db.execute(
        select(Warehouse).where(Warehouse.code == warehouse_in.code)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=400, detail="Warehouse with this code already exists"
        )

    # Create location point from lat/lng
    location = WKTElement(
        f"POINT({warehouse_in.longitude} {warehouse_in.latitude})", srid=4326
    )

    warehouse = Warehouse(
        code=warehouse_in.code,
        name=warehouse_in.name,
        location=location,
    )
    db.add(warehouse)
    await db.commit()
    await db.refresh(warehouse)
    return warehouse


@router.put("/{warehouse_id}", response_model=WarehouseSchema)
async def update_warehouse(
    *,
    db: AsyncSession = Depends(deps.get_db),
    warehouse_id: int,
    warehouse_in: WarehouseUpdate,
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Update a warehouse.
    Admin only.
    """
    warehouse = await db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Check if new code conflicts with existing warehouse
    if warehouse_in.code != warehouse.code:
        result = await db.execute(
            select(Warehouse).where(Warehouse.code == warehouse_in.code)
        )
        if result.scalars().first():
            raise HTTPException(
                status_code=400, detail="Warehouse with this code already exists"
            )

    warehouse.code = warehouse_in.code
    warehouse.name = warehouse_in.name
    warehouse.location = WKTElement(
        f"POINT({warehouse_in.longitude} {warehouse_in.latitude})", srid=4326
    )

    db.add(warehouse)
    await db.commit()
    await db.refresh(warehouse)
    return warehouse


@router.delete("/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Delete a warehouse.
    Admin only. Cannot delete warehouses with active drivers or orders.
    """
    warehouse = await db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Check for associated drivers
    from app.models.driver import Driver

    result = await db.execute(
        select(Driver).where(Driver.warehouse_id == warehouse_id).limit(1)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete warehouse with assigned drivers. Reassign drivers first.",
        )

    # Check for associated orders
    from app.models.order import Order

    result = await db.execute(
        select(Order).where(Order.warehouse_id == warehouse_id).limit(1)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete warehouse with orders. Delete or reassign orders first.",
        )

    await db.delete(warehouse)
    await db.commit()
    return {"msg": f"Warehouse {warehouse_id} deleted successfully"}
