from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, field_serializer


class NotificationBase(BaseModel):
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationUpdate(BaseModel):
    is_read: bool


class NotificationInDBBase(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    sent_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "sent_at")
    def serialize_datetime(self, dt: datetime | None) -> str | None:
        if dt is None:
            return None
        # If naive, assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")


class Notification(NotificationInDBBase):
    pass
