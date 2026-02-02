from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base


class Driver(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), unique=True)
    warehouse_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("warehouse.id"), nullable=True
    )  # Assigned warehouse

    biometric_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    vehicle_info: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    last_online_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    # Use lazy='raise' to prevent accidental lazy loading in async context
    user = relationship("User", back_populates="driver_profile", lazy="raise")
    warehouse = relationship("Warehouse", back_populates="drivers", lazy="raise")
    orders = relationship("Order", back_populates="driver", lazy="raise")
    locations = relationship("DriverLocation", back_populates="driver", lazy="raise")
    payments_collected = relationship("PaymentCollection", back_populates="driver", lazy="raise")
