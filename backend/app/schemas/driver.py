from typing import Optional, List
from pydantic import BaseModel


class DriverBase(BaseModel):
    is_available: bool = True
    vehicle_info: Optional[str] = None
    biometric_id: Optional[str] = None
    warehouse_id: Optional[int] = None


class DriverCreate(DriverBase):
    user_id: int


class DriverUpdate(DriverBase):
    pass


class DriverInDBBase(DriverBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class Driver(DriverInDBBase):
    pass


class DriverDetail(Driver):
    pass
