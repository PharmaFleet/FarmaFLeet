from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import User as UserSchema
from app.schemas.warehouse import Warehouse as WarehouseSchema


class DriverBase(BaseModel):
    is_available: bool = True
    vehicle_info: Optional[str] = None
    biometric_id: Optional[str] = None
    warehouse_id: Optional[int] = None


class DriverCreate(DriverBase):
    user_id: Optional[int] = None


class DriverWithUserCreate(DriverBase):
    email: str
    password: str
    full_name: str
    role: str = "driver"


class DriverUpdate(DriverBase):
    pass


class DriverStatusUpdate(BaseModel):
    is_available: bool


class DriverInDBBase(DriverBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)


class Driver(DriverInDBBase):
    user: Optional[UserSchema] = None
    warehouse: Optional[WarehouseSchema] = None


class DriverDetail(Driver):
    pass


class PaginatedDriverResponse(BaseModel):
    items: List[Driver]
    total: int
    page: int
    size: int
    pages: int
