from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


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


class Notification(NotificationInDBBase):
    pass
