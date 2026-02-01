from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator


class DriverLocationBase(BaseModel):
    """Base schema for driver location with coordinate validation."""

    latitude: float
    longitude: float

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not -90 <= v <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not -180 <= v <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v


class DriverLocationCreate(DriverLocationBase):
    """Schema for creating a new driver location update."""

    pass


class DriverLocation(DriverLocationBase):
    """Schema for driver location response with metadata."""

    id: int
    driver_id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class DriverLocationResponse(DriverLocation):
    """Extended location response with driver details for map display."""

    driver_name: str | None = None
    vehicle_info: str | None = None
    is_available: bool = True
