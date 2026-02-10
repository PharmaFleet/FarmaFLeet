"""
Order Status Service

Centralizes order status transition logic including:
- Status timestamp mapping
- Status history creation
- Status transition validation
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.models.order import Order, OrderStatus, OrderStatusHistory


# Mapping of status to the timestamp field that should be updated
STATUS_TIMESTAMP_FIELDS: Dict[OrderStatus, str] = {
    OrderStatus.ASSIGNED: "assigned_at",
    OrderStatus.PICKED_UP: "picked_up_at",
    OrderStatus.DELIVERED: "delivered_at",
}

# Valid status transitions: current_status -> [allowed_next_statuses]
VALID_TRANSITIONS: Dict[OrderStatus, list] = {
    OrderStatus.PENDING: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
    OrderStatus.ASSIGNED: [
        OrderStatus.PENDING,  # unassign
        OrderStatus.PICKED_UP,
        OrderStatus.CANCELLED,
    ],
    OrderStatus.PICKED_UP: [
        OrderStatus.IN_TRANSIT,
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.DELIVERED,
        OrderStatus.REJECTED,
        OrderStatus.CANCELLED,
    ],
    OrderStatus.IN_TRANSIT: [
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.DELIVERED,
        OrderStatus.REJECTED,
        OrderStatus.CANCELLED,
    ],
    OrderStatus.OUT_FOR_DELIVERY: [
        OrderStatus.DELIVERED,
        OrderStatus.REJECTED,
        OrderStatus.CANCELLED,
    ],
    OrderStatus.DELIVERED: [OrderStatus.RETURNED],
    OrderStatus.REJECTED: [OrderStatus.PENDING],  # can be reassigned
    OrderStatus.RETURNED: [],  # terminal status
    OrderStatus.CANCELLED: [],  # terminal status
}

# Statuses valid for marking delivery complete
DELIVERY_READY_STATUSES = [
    OrderStatus.PICKED_UP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.OUT_FOR_DELIVERY,
]


class OrderStatusService:
    """
    Service for managing order status transitions.

    Usage:
        service = OrderStatusService()

        # Apply status with timestamp
        service.apply_status(order, OrderStatus.DELIVERED, "Delivered by driver")
        db.add(history_entry)  # returned from apply_status

        # Validate transition
        if not service.can_transition(order.status, new_status):
            raise HTTPException(...)
    """

    @staticmethod
    def get_timestamp_field(status: OrderStatus) -> Optional[str]:
        """
        Get the timestamp field name that should be updated for a given status.
        Returns None if no timestamp field is associated with the status.
        """
        return STATUS_TIMESTAMP_FIELDS.get(status)

    @staticmethod
    def can_transition(current_status: OrderStatus, new_status: OrderStatus) -> bool:
        """
        Check if transitioning from current_status to new_status is valid.
        """
        # Convert string to enum if needed
        if isinstance(current_status, str):
            try:
                current_status = OrderStatus(current_status)
            except ValueError:
                return False
        if isinstance(new_status, str):
            try:
                new_status = OrderStatus(new_status)
            except ValueError:
                return False

        allowed = VALID_TRANSITIONS.get(current_status, [])
        return new_status in allowed

    @staticmethod
    def is_delivery_ready(status: OrderStatus) -> bool:
        """
        Check if the order is in a status that allows delivery completion.
        """
        if isinstance(status, str):
            try:
                status = OrderStatus(status)
            except ValueError:
                return False
        return status in DELIVERY_READY_STATUSES

    @staticmethod
    def update_status_timestamp(order: Order, status: OrderStatus) -> None:
        """
        Update the appropriate timestamp field on the order for the given status.
        Modifies the order in-place.
        """
        field = STATUS_TIMESTAMP_FIELDS.get(status)
        if field:
            setattr(order, field, datetime.now(timezone.utc))

    @staticmethod
    def create_status_history(
        order_id: int,
        status: OrderStatus,
        notes: Optional[str] = None,
    ) -> OrderStatusHistory:
        """
        Create an OrderStatusHistory entry for a status change.
        Returns the history entry (caller should add it to the session).
        """
        return OrderStatusHistory(
            order_id=order_id,
            status=status,
            notes=notes,
        )

    @staticmethod
    def apply_status(
        order: Order,
        new_status: OrderStatus,
        notes: Optional[str] = None,
    ) -> OrderStatusHistory:
        """
        Apply a new status to an order:
        1. Updates order.status
        2. Updates the appropriate timestamp field
        3. Creates and returns a status history entry

        Note: Caller is responsible for adding the returned history to the session.

        Args:
            order: The order to update
            new_status: The new status to apply
            notes: Optional notes for the status history

        Returns:
            OrderStatusHistory entry that should be added to the db session
        """
        order.status = new_status
        OrderStatusService.update_status_timestamp(order, new_status)
        return OrderStatusService.create_status_history(
            order_id=order.id,
            status=new_status,
            notes=notes,
        )

    @staticmethod
    def apply_assignment(
        order: Order,
        driver_id: int,
        notes: Optional[str] = None,
    ) -> OrderStatusHistory:
        """
        Apply assignment status to an order with driver.
        Convenience method that sets driver_id and applies ASSIGNED status.

        Args:
            order: The order to update
            driver_id: The driver ID to assign
            notes: Optional notes for the status history

        Returns:
            OrderStatusHistory entry that should be added to the db session
        """
        order.driver_id = driver_id
        return OrderStatusService.apply_status(
            order,
            OrderStatus.ASSIGNED,
            notes=notes,
        )

    @staticmethod
    def apply_unassignment(
        order: Order,
        notes: Optional[str] = "Unassigned by manager",
    ) -> OrderStatusHistory:
        """
        Remove driver assignment and reset to PENDING status.

        Args:
            order: The order to update
            notes: Optional notes for the status history

        Returns:
            OrderStatusHistory entry that should be added to the db session
        """
        order.driver_id = None
        order.status = OrderStatus.PENDING
        order.assigned_at = None
        return OrderStatusService.create_status_history(
            order_id=order.id,
            status=OrderStatus.PENDING,
            notes=notes,
        )

    @staticmethod
    def get_status_display_name(status: OrderStatus) -> str:
        """
        Get a human-readable display name for a status.
        """
        display_names = {
            OrderStatus.PENDING: "Pending",
            OrderStatus.ASSIGNED: "Assigned",
            OrderStatus.PICKED_UP: "Picked Up",
            OrderStatus.IN_TRANSIT: "In Transit",
            OrderStatus.OUT_FOR_DELIVERY: "Out for Delivery",
            OrderStatus.DELIVERED: "Delivered",
            OrderStatus.REJECTED: "Rejected",
            OrderStatus.RETURNED: "Returned",
            OrderStatus.CANCELLED: "Cancelled",
        }
        return display_names.get(status, str(status))


# Singleton instance for convenience
order_status_service = OrderStatusService()
