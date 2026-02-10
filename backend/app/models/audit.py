from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base

class AuditLog(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True)
    action: Mapped[str] = mapped_column(String, index=True)
    resource_type: Mapped[str] = mapped_column(String, index=True)
    resource_id: Mapped[str | None] = mapped_column(String, nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
