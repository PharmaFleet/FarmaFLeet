from datetime import datetime
from pydantic import BaseModel, validator


class DriverLocationBase(BaseModel):
    latitude: float
    longitude: float


class DriverLocationCreate(DriverLocationBase):
    pass


class DriverLocation(DriverLocationBase):
    id: int
    driver_id: int
    timestamp: datetime

    class Config:
        from_attributes = True
