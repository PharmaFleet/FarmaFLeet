from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
from app.db.base_class import Base

class Warehouse(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True) # e.g. WH01
    name: Mapped[str] = mapped_column(String)
    # Location using PostGIS Point (Latitude, Longitude)
    location: Mapped[str] = mapped_column(Geometry("POINT", srid=4326))

    # Relationships
    drivers = relationship("Driver", back_populates="warehouse")
    orders = relationship("Order", back_populates="warehouse")
