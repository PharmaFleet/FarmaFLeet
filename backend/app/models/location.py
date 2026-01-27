from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
from app.db.base_class import Base


class DriverLocation(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("driver.id"), index=True)
    location: Mapped[Geometry] = mapped_column(Geometry("POINT", srid=4326))
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )

    # Relationships
    driver = relationship("Driver", back_populates="locations")

    @property
    def latitude(self) -> float:
        from geoalchemy2.shape import to_shape

        try:
            shape = to_shape(self.location)
            return shape.y
        except:
            return 0.0

    @property
    def longitude(self) -> float:
        from geoalchemy2.shape import to_shape

        try:
            shape = to_shape(self.location)
            return shape.x
        except:
            return 0.0
