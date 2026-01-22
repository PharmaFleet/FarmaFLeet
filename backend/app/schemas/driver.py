from typing import Optional
from pydantic import BaseModel, ConfigDict


class DriverBase(BaseModel):
    is_available: bool = True
    vehicle_info: Optional[str] = None
    biometric_id: Optional[str] = None
    warehouse_id: Optional[int] = None


class DriverCreate(DriverBase):
    user_id: int


class DriverUpdate(DriverBase):
    pass


class DriverStatusUpdate(BaseModel):
    is_available: bool


class DriverInDBBase(DriverBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)


class Driver(DriverInDBBase):
    pass


class DriverDetail(Driver):
    pass
