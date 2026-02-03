from datetime import datetime, timezone
from typing import Optional
import enum
from sqlalchemy import String, ForeignKey, DateTime, Text, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base_class import Base


def utc_now():
    return datetime.now(timezone.utc)


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    REJECTED = "rejected"
    RETURNED = "returned"
    CANCELLED = "cancelled"


class Order(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sales_order_number: Mapped[str] = mapped_column(String, unique=True, index=True)
    customer_info: Mapped[dict] = mapped_column(JSONB)  # Name, Address, Phone, Lat/Long
    status: Mapped[str] = mapped_column(String, default=OrderStatus.PENDING, index=True)
    payment_method: Mapped[str] = mapped_column(String)  # COD, Knet, Link
    total_amount: Mapped[float] = mapped_column(Float)

    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouse.id"), index=True)
    driver_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("driver.id"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    # Archiving - orders older than 7 days with DELIVERED status are auto-archived
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # Relationships
    warehouse = relationship("Warehouse", back_populates="orders")
    driver = relationship("Driver", back_populates="orders")
    status_history = relationship(
        "OrderStatusHistory", back_populates="order", cascade="all, delete-orphan"
    )
    proof_of_delivery = relationship(
        "ProofOfDelivery", back_populates="order", uselist=False
    )
    payment = relationship("PaymentCollection", back_populates="order", uselist=False)


class OrderStatusHistory(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("order.id"))
    status: Mapped[str] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    order = relationship("Order", back_populates="status_history")


class ProofOfDelivery(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("order.id"), unique=True)
    signature_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    order = relationship("Order", back_populates="proof_of_delivery")
