from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.warehouse import Warehouse
from app.models.user import User
from app.schemas.warehouse import Warehouse as WarehouseSchema

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
    """
    result = await db.execute(select(Warehouse).offset(skip).limit(limit))
    return result.scalars().all()
