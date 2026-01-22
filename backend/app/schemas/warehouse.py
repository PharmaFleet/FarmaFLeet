from typing import Optional
from pydantic import BaseModel


class WarehouseBase(BaseModel):
    code: str
    name: str
    latitude: float
    longitude: float


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(WarehouseBase):
    pass


class WarehouseInDBBase(WarehouseBase):
    id: int

    class Config:
        from_attributes = True


class Warehouse(WarehouseInDBBase):
    pass
