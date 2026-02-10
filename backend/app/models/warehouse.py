from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, column_property
from sqlalchemy import select
from geoalchemy2 import Geometry
from app.db.base_class import Base


class Warehouse(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)  # e.g. WH01
    name: Mapped[str] = mapped_column(String)
    # Location using PostGIS Point (Latitude, Longitude)
    location: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=True)

    # Computed columns using PostGIS functions - these are calculated at query time
    # ST_Y extracts latitude (Y coordinate), ST_X extracts longitude (X coordinate)
    latitude = column_property(
        func.coalesce(func.ST_Y(func.cast(location, Geometry)), 0.0)
    )
    longitude = column_property(
        func.coalesce(func.ST_X(func.cast(location, Geometry)), 0.0)
    )

    # Relationships
    drivers = relationship("Driver", back_populates="warehouse")
    orders = relationship("Order", back_populates="warehouse")
