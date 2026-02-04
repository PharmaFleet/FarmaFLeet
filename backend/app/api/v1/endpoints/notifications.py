from typing import Any, List
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func

from app.api import deps
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import Notification as NotificationSchema

router = APIRouter()


@router.get("", response_model=List[NotificationSchema])
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


@router.patch("/mark-all-read")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Mark all notifications as read for the current user.
    """
    stmt = (
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read.is_(False))
        .values(is_read=True)
    )
    result = await db.execute(stmt)
    await db.commit()
    return {"msg": f"Marked {result.rowcount} notifications as read"}


@router.delete("/clear")
async def clear_notifications(
    keep_unread: bool = Query(default=False, description="If true, only delete read notifications"),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Clear notifications for the current user.
    By default, deletes all notifications.
    Set keep_unread=True to only delete read notifications.
    """
    stmt = delete(Notification).where(Notification.user_id == current_user.id)

    if keep_unread:
        stmt = stmt.where(Notification.is_read.is_(True))

    result = await db.execute(stmt)
    await db.commit()
    return {"msg": f"Deleted {result.rowcount} notifications"}


@router.get("/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get the count of unread notifications for the current user.
    """
    stmt = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read.is_(False))
    )
    result = await db.execute(stmt)
    count = result.scalar() or 0
    return {"unread_count": count}
