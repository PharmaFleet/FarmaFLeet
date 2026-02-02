from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, column_property
from geoalchemy2 import Geometry

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.driver import Driver


class DriverLocation(Base):
    """Driver location tracking with PostGIS support."""

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("driver.id"), index=True)
    location: Mapped[Geometry] = mapped_column(Geometry("POINT", srid=4326))
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )

    # Computed columns using PostGIS SQL functions (works on Vercel serverless)
    # ST_Y extracts latitude (Y coordinate), ST_X extracts longitude (X coordinate)
    latitude = column_property(
        func.coalesce(func.ST_Y(func.cast(location, Geometry)), 0.0)
    )
    longitude = column_property(
        func.coalesce(func.ST_X(func.cast(location, Geometry)), 0.0)
    )

    # Relationships
    driver: Mapped["Driver"] = relationship("Driver", back_populates="locations")

    def to_dict(self) -> dict[str, float | int | datetime | None]:
        """Convert location to dictionary for API responses."""
        return {
            "id": self.id,
            "driver_id": self.driver_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "timestamp": self.timestamp,
        }
