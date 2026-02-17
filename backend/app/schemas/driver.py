from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.user import User as UserSchema
from app.schemas.warehouse import Warehouse as WarehouseSchema


class DriverBase(BaseModel):
    is_available: bool = False
    code: Optional[str] = None
    vehicle_info: Optional[str] = None
    vehicle_type: Optional[str] = None  # "car" or "motorcycle"
    biometric_id: Optional[str] = None
    warehouse_id: Optional[int] = None


class DriverCreate(DriverBase):
    user_id: Optional[int] = None


class DriverWithUserCreate(DriverBase):
    email: str
    password: str
    full_name: str
    role: str = "driver"
    phone: Optional[str] = None


class DriverUpdate(BaseModel):
    """Fields that can be updated on an existing driver."""

    is_available: Optional[bool] = None
    code: Optional[str] = None
    vehicle_info: Optional[str] = None
    vehicle_type: Optional[str] = None
    biometric_id: Optional[str] = None
    warehouse_id: Optional[int] = None
    # User-related fields (updates the associated User model)
    user_full_name: Optional[str] = None
    user_phone: Optional[str] = None


class DriverStatusUpdate(BaseModel):
    is_available: bool


class DriverInDBBase(DriverBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)


class Driver(DriverInDBBase):
    user: Optional[UserSchema] = None
    warehouse: Optional[WarehouseSchema] = None
    total_deliveries: Optional[int] = 0
    rating: Optional[float] = None


class DriverDetail(Driver):
    pass


class PaginatedDriverResponse(BaseModel):
    items: List[Driver]
    total: int
    page: int
    size: int
    pages: int
