import enum
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    WAREHOUSE_MANAGER = "warehouse_manager"
    DISPATCHER = "dispatcher"
    EXECUTIVE = "executive"
    DRIVER = "driver"


class User(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[str] = mapped_column(
        String, default=UserRole.DISPATCHER, index=True
    )  # Storing as string for simplicity
    fcm_token: Mapped[str] = mapped_column(String, nullable=True)

    # Relationships
    driver_profile = relationship("Driver", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")
