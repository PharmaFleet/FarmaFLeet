from pydantic import BaseModel, ConfigDict


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
    model_config = ConfigDict(from_attributes=True)


class Warehouse(WarehouseInDBBase):
    pass
