from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import ForeignKey, DateTime, String, Float, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base


def utc_now():
    return datetime.now(timezone.utc)


class PaymentMethod(str, Enum):
    CASH = "CASH"
    COD = "COD"
    KNET = "KNET"
    LINK = "LINK"
    CREDIT_CARD = "CREDIT_CARD"


class PaymentCollection(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("order.id"), unique=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("driver.id"))
    amount: Mapped[float] = mapped_column(Float)
    method: Mapped[PaymentMethod] = mapped_column(SQLEnum(PaymentMethod))
    transaction_id: Mapped[str | None] = mapped_column(String, nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    verified_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("user.id"), nullable=True
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    order = relationship("Order", back_populates="payment")
    driver = relationship("Driver", back_populates="payments_collected")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
