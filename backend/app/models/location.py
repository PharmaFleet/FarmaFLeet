from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape

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

    # Relationships
    driver: Mapped["Driver"] = relationship("Driver", back_populates="locations")

    @property
    def latitude(self) -> float:
        """Extract latitude from PostGIS POINT geometry."""
        if self.location is None:
            return 0.0
        try:
            shape = to_shape(self.location)
            return float(shape.y)
        except (AttributeError, ValueError, TypeError):
            return 0.0

    @property
    def longitude(self) -> float:
        """Extract longitude from PostGIS POINT geometry."""
        if self.location is None:
            return 0.0
        try:
            shape = to_shape(self.location)
            return float(shape.x)
        except (AttributeError, ValueError, TypeError):
            return 0.0

    def to_dict(self) -> dict[str, float | int | datetime | None]:
        """Convert location to dictionary for API responses."""
        return {
            "id": self.id,
            "driver_id": self.driver_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "timestamp": self.timestamp,
        }
