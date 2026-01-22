from typing import Any, List
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.api import deps
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import Notification as NotificationSchema
# Need a schema for device token? Or just Body string.

router = APIRouter()


@router.get("/", response_model=List[NotificationSchema])
async def read_notifications(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user's notifications.
    """
    query = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    notifications = result.scalars().all()
    return notifications


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Mark notification as read.
    """
    query = select(Notification).where(
        Notification.id == notification_id, Notification.user_id == current_user.id
    )
    result = await db.execute(query)
    notification = result.scalars().first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.add(notification)
    await db.commit()
    return {"msg": "Notification marked as read"}


@router.post("/register-device")
async def register_device(
    fcm_token: str = Body(..., embed=True),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Register device FCM token for push notifications.
    """
    # Ideally store this in a Device model or User field.
    # For now, print or mock.
    # In real app: Redis or DB table 'UserDevices'
    print(f"Registered FCM token for user {current_user.id}: {fcm_token}")
    return {"msg": "Device registered successfully"}
