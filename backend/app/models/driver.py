from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base

class Driver(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), unique=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouse.id"), nullable=True) # Assigned warehouse
    
    biometric_id: Mapped[str] = mapped_column(String, nullable=True)
    vehicle_info: Mapped[str] = mapped_column(String, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="driver_profile")
    warehouse = relationship("Warehouse", back_populates="drivers")
    orders = relationship("Order", back_populates="driver")
    locations = relationship("DriverLocation", back_populates="driver")
    payments_collected = relationship("PaymentCollection", back_populates="driver")
