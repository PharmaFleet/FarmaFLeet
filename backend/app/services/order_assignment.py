"""
Order Assignment Service

Handles all order assignment operations including:
- Single order assignment
- Batch assignment
- Unassignment
- Driver validation
- Assignment notifications
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import DriverNotFoundException, DriverNotAvailableException
from app.models.driver import Driver
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.models.notification import Notification
from app.services.notification import notification_service
from app.services.order_status import order_status_service
import logging

logger = logging.getLogger(__name__)


async def get_driver_with_user(
    db: AsyncSession, driver_id: int
) -> Driver:
    """
    Fetch a driver with their user relationship.
    Raises DriverNotFoundException if driver does not exist.
    """
    stmt = (
        select(Driver)
        .where(Driver.id == driver_id)
        .options(selectinload(Driver.user), selectinload(Driver.warehouse))
    )
    result = await db.execute(stmt)
    driver = result.scalars().first()

    if not driver:
        raise DriverNotFoundException(f"Driver with ID {driver_id} not found")

    return driver


async def validate_driver_availability(driver: Driver) -> None:
    """
    Validate that a driver is available for assignment.
    Raises DriverNotAvailableException if driver is not available.
    """
    if not driver.user.is_active:
        raise DriverNotAvailableException(
            f"Driver {driver.id} is not active"
        )


async def assign_order(
    db: AsyncSession,
    order: Order,
    driver_id: int,
    assigned_by: User,
) -> Order:
    """
    Assign a single order to a driver.

    Args:
        db: Database session
        order: The order to assign
        driver_id: ID of the driver to assign
        assigned_by: User performing the assignment

    Returns:
        The updated order with driver relationship loaded

    Raises:
        DriverNotFoundException: If driver does not exist
        DriverNotAvailableException: If driver is not available
    """
    # Get driver with user relationship
    driver = await get_driver_with_user(db, driver_id)
    await validate_driver_availability(driver)

    # Track previous driver for reassignment notification
    previous_driver = order.driver
    previous_driver_user = previous_driver.user if previous_driver else None
    is_reassignment = previous_driver is not None and previous_driver.id != driver_id

    # Use order_status_service for assignment with proper timestamp handling
    notes = f"Assigned to driver {driver.user_id}" + (" (reassigned)" if is_reassignment else "")
    history = order_status_service.apply_assignment(order, driver.id, notes)
    db.add(history)
    db.add(order)
    await db.flush()

    # Send notifications
    await _send_assignment_notifications(
        db=db,
        order=order,
        driver=driver,
        assigned_by=assigned_by,
        is_reassignment=is_reassignment,
        previous_driver_user=previous_driver_user,
    )

    return order


async def batch_assign_orders(
    db: AsyncSession,
    assignments: List[Dict[str, int]],
    assigned_by: User,
    user_warehouse_ids: Optional[List[int]],
) -> Dict[str, Any]:
    """
    Batch assign multiple orders to drivers.

    Args:
        db: Database session
        assignments: List of {"order_id": int, "driver_id": int} dicts
        assigned_by: User performing the assignments
        user_warehouse_ids: Warehouse IDs the user has access to (None = all)

    Returns:
        Dict with "assigned" count and driver notification info
    """
    count = 0
    driver_notifications: Dict[int, Dict[str, Any]] = {}

    # Collect all unique IDs for bulk fetching
    order_ids = [a.get("order_id") for a in assignments if a.get("order_id")]
    driver_ids = list(set(a.get("driver_id") for a in assignments if a.get("driver_id")))

    # Bulk fetch orders
    orders_result = await db.execute(select(Order).where(Order.id.in_(order_ids)))
    orders_map: Dict[int, Order] = {o.id: o for o in orders_result.scalars().all()}

    # Bulk fetch drivers with eager loading
    drivers_result = await db.execute(
        select(Driver)
        .where(Driver.id.in_(driver_ids))
        .options(selectinload(Driver.user), selectinload(Driver.warehouse))
    )
    drivers_map: Dict[int, Driver] = {d.id: d for d in drivers_result.scalars().all()}

    for assign in assignments:
        order_id = assign.get("order_id")
        driver_id = assign.get("driver_id")
        if not order_id or not driver_id:
            continue

        order = orders_map.get(order_id)
        driver = drivers_map.get(driver_id)

        if order and driver:
            # Check warehouse access
            if user_warehouse_ids is not None and order.warehouse_id not in user_warehouse_ids:
                continue

            # Use order_status_service for assignment with proper timestamp handling
            notes = f"Batch assigned to driver {driver.user_id}"
            history = order_status_service.apply_assignment(order, driver.id, notes)
            db.add(history)
            db.add(order)
            count += 1

            # Collect notification info
            if driver.user.fcm_token:
                if driver_id not in driver_notifications:
                    driver_notifications[driver_id] = {
                        "token": driver.user.fcm_token,
                        "user_id": driver.user_id,
                        "count": 0,
                    }
                driver_notifications[driver_id]["count"] += 1

    await db.flush()

    # Send notifications to drivers
    for drv_id, data in driver_notifications.items():
        if data["count"] > 0:
            await notification_service.notify_driver_new_orders(
                db, data["user_id"], data["count"], data["token"]
            )

    # Notify admin users about batch assignment
    if count > 0:
        await _notify_admins_batch_assignment(db, count, assigned_by)

    return {"assigned": count}


async def unassign_order(
    db: AsyncSession,
    order: Order,
) -> Order:
    """
    Unassign an order from its driver.

    Args:
        db: Database session
        order: The order to unassign

    Returns:
        The updated order
    """
    # Use order_status_service for unassignment
    history = order_status_service.apply_unassignment(order, "Unassigned by manager")
    db.add(history)
    db.add(order)

    return order


async def _send_assignment_notifications(
    db: AsyncSession,
    order: Order,
    driver: Driver,
    assigned_by: User,
    is_reassignment: bool = False,
    previous_driver_user: Optional[User] = None,
) -> None:
    """Send notifications for order assignment."""
    # Notify new driver
    if driver.user.fcm_token:
        await notification_service.notify_driver_new_orders(
            db, driver.user_id, 1, driver.user.fcm_token
        )

    # Notify previous driver about reassignment
    if is_reassignment and previous_driver_user:
        await notification_service.notify_driver_order_reassigned(
            db=db,
            user_id=previous_driver_user.id,
            order_id=order.id,
            order_number=order.sales_order_number,
            token=previous_driver_user.fcm_token,
        )

    # Notify admin users
    await notification_service.notify_admins_order_assigned(
        db=db,
        order_id=order.id,
        order_number=order.sales_order_number or f"#{order.id}",
        driver_name=driver.user.full_name or driver.user.email,
        assigned_by_name=assigned_by.full_name or assigned_by.email,
    )


async def _notify_admins_batch_assignment(
    db: AsyncSession,
    count: int,
    assigned_by: User,
) -> None:
    """Notify admin users about batch assignment."""
    admin_roles = [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.DISPATCHER]
    stmt = select(User).where(User.role.in_(admin_roles), User.is_active.is_(True))
    result = await db.execute(stmt)
    admin_users = result.scalars().all()

    title = "Batch Assignment"
    body = f"{count} orders assigned by {assigned_by.full_name or assigned_by.email}"

    for user in admin_users:
        notif = Notification(
            user_id=user.id,
            title=title,
            body=body,
            data={"type": "order", "count": str(count)},
            created_at=datetime.now(timezone.utc),
        )
        db.add(notif)
