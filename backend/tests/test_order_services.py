"""
Comprehensive tests for Order Services

Tests for:
- OrderQueryBuilder: Query building and filtering logic
- OrderStatusService: Status transitions and validation
- Order Assignment: Single and batch assignment logic
- ProofOfDeliveryService: POD upload and validation

Uses SQLite in-memory database for fast testing.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta
from typing import Optional


# ============================================================================
# OrderQueryBuilder Tests
# ============================================================================


class TestOrderQueryBuilder:
    """Tests for OrderQueryBuilder filter and query building methods."""

    def test_builder_initialization(self):
        """Test that builder initializes with empty filters."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        assert builder._filters == []
        assert builder._sort_by is None
        assert builder._sort_order == "desc"

    def test_with_warehouse_access_none_for_super_admin(self):
        """Test that None warehouse_ids (super_admin) adds no filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        result = builder.with_warehouse_access(None)

        # Should return self for chaining
        assert result is builder
        # No filter should be added for super_admin
        assert len(builder._filters) == 0

    def test_with_warehouse_access_empty_list(self):
        """Test that empty warehouse_ids list adds no filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_warehouse_access([])

        # Empty list means no access, but no filter is added (empty result expected)
        assert len(builder._filters) == 0

    def test_with_warehouse_access_with_ids(self):
        """Test that warehouse_ids adds IN filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_warehouse_access([1, 2, 3])

        assert len(builder._filters) == 1

    def test_with_archive_filter_true(self):
        """Test archive filter for archived orders."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_archive_filter(True)

        assert len(builder._filters) == 1

    def test_with_archive_filter_false(self):
        """Test archive filter for non-archived orders."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_archive_filter(False)

        assert len(builder._filters) == 1

    def test_with_status_filter(self):
        """Test status filter is applied."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_status("pending")

        assert len(builder._filters) == 1

    def test_with_status_none_no_filter(self):
        """Test that None status adds no filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_status(None)

        assert len(builder._filters) == 0

    def test_with_warehouse_id_filter(self):
        """Test warehouse_id filter is applied."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_warehouse_id(5)

        assert len(builder._filters) == 1

    def test_with_warehouse_id_none_no_filter(self):
        """Test that None warehouse_id adds no filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_warehouse_id(None)

        assert len(builder._filters) == 0

    def test_with_driver_id_filter(self):
        """Test driver_id filter is applied."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_driver_id(10)

        assert len(builder._filters) == 1

    def test_with_customer_name_filter(self):
        """Test customer name partial match filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_customer_name("Ahmed")

        assert len(builder._filters) == 1

    def test_with_customer_phone_filter(self):
        """Test customer phone partial match filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_customer_phone("9655")

        assert len(builder._filters) == 1

    def test_with_customer_address_filter(self):
        """Test customer address partial match filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_customer_address("Block 5")

        assert len(builder._filters) == 1

    def test_with_order_number_filter(self):
        """Test order number partial match filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_order_number("SO-123")

        assert len(builder._filters) == 1

    def test_with_driver_name_filter(self):
        """Test driver name subquery filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_driver_name("Mohammed")

        assert len(builder._filters) == 1

    def test_with_driver_code_filter(self):
        """Test driver code subquery filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_driver_code("DRV001")

        assert len(builder._filters) == 1

    def test_with_sales_taker_filter(self):
        """Test sales taker partial match filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_sales_taker("John")

        assert len(builder._filters) == 1

    def test_with_payment_method_filter(self):
        """Test payment method partial match filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_payment_method("COD")

        assert len(builder._filters) == 1

    def test_with_date_range_from_only(self):
        """Test date range filter with only from date."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_date_range(date_from="2024-01-01")

        assert len(builder._filters) == 1

    def test_with_date_range_to_only(self):
        """Test date range filter with only to date."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_date_range(date_to="2024-12-31")

        assert len(builder._filters) == 1

    def test_with_date_range_both(self):
        """Test date range filter with both from and to dates."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_date_range(date_from="2024-01-01", date_to="2024-12-31")

        assert len(builder._filters) == 2

    def test_with_date_range_invalid_date_format(self):
        """Test that invalid date format is handled gracefully."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        # Invalid format should not raise, just skip
        builder.with_date_range(date_from="invalid-date")

        # Invalid date should not add a filter
        assert len(builder._filters) == 0

    def test_with_date_range_different_fields(self):
        """Test date range filter on different date fields."""
        from app.services.order_query import OrderQueryBuilder

        for field in ["created_at", "assigned_at", "picked_up_at", "delivered_at"]:
            builder = OrderQueryBuilder()
            builder.with_date_range(date_from="2024-01-01", date_field=field)
            assert len(builder._filters) == 1

    def test_with_universal_search(self):
        """Test universal search across multiple fields."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_universal_search("test search")

        # Universal search creates a single OR filter
        assert len(builder._filters) == 1

    def test_with_universal_search_amount(self):
        """Test universal search with numeric value for amount."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_universal_search("25.5")

        assert len(builder._filters) == 1

    def test_with_universal_search_none_no_filter(self):
        """Test that None search adds no filter."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_universal_search(None)

        assert len(builder._filters) == 0

    def test_with_sorting(self):
        """Test sorting configuration."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        result = builder.with_sorting("created_at", "asc")

        assert result is builder
        assert builder._sort_by == "created_at"
        assert builder._sort_order == "asc"

    def test_with_sorting_default_order(self):
        """Test sorting with default order."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_sorting("status")

        assert builder._sort_by == "status"
        assert builder._sort_order == "desc"

    def test_method_chaining(self):
        """Test that all filter methods support chaining."""
        from app.services.order_query import OrderQueryBuilder

        builder = (
            OrderQueryBuilder()
            .with_warehouse_access([1, 2])
            .with_archive_filter(False)
            .with_status("pending")
            .with_customer_name("Test")
            .with_sorting("created_at", "asc")
        )

        assert len(builder._filters) == 4
        assert builder._sort_by == "created_at"
        assert builder._sort_order == "asc"

    def test_build_returns_query_and_count_query(self):
        """Test that build returns both query and count query."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_status("pending")

        query, count_query = builder.build()

        # Both should be SQLAlchemy Select statements
        assert query is not None
        assert count_query is not None

    def test_build_with_pagination(self):
        """Test build with pagination returns query, count_query, and skip."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        builder.with_status("pending")

        query, count_query, skip = builder.build_with_pagination(page=2, limit=10)

        assert query is not None
        assert count_query is not None
        assert skip == 10  # (page 2 - 1) * 10

    def test_build_with_pagination_first_page(self):
        """Test pagination on first page."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()
        query, count_query, skip = builder.build_with_pagination(page=1, limit=25)

        assert skip == 0

    def test_get_sort_column_standard_columns(self):
        """Test _get_sort_column for standard columns."""
        from app.services.order_query import OrderQueryBuilder, SORT_COLUMNS

        builder = OrderQueryBuilder()

        for column_name in ["created_at", "updated_at", "status", "total_amount"]:
            builder._sort_by = column_name
            result = builder._get_sort_column()
            assert result is not None

    def test_get_sort_column_subquery_columns(self):
        """Test _get_sort_column for subquery-based columns."""
        from app.services.order_query import OrderQueryBuilder

        builder = OrderQueryBuilder()

        for column_name in ["driver_name", "driver_code", "warehouse_code"]:
            builder._sort_by = column_name
            result = builder._get_sort_column()
            assert result is not None

    def test_get_sort_column_invalid_defaults_to_created_at(self):
        """Test that invalid sort column defaults to created_at."""
        from app.services.order_query import OrderQueryBuilder
        from app.models.order import Order

        builder = OrderQueryBuilder()
        builder._sort_by = "invalid_column"
        result = builder._get_sort_column()

        # Should default to Order.created_at
        assert result is Order.created_at

    def test_apply_eager_loading(self):
        """Test that eager loading options are applied."""
        from app.services.order_query import OrderQueryBuilder
        from sqlalchemy import select
        from app.models.order import Order

        builder = OrderQueryBuilder()
        query = select(Order)

        result = builder.apply_eager_loading(query)

        # Query should have options applied
        assert result is not None

    def test_apply_export_loading(self):
        """Test that export loading options are applied."""
        from app.services.order_query import OrderQueryBuilder
        from sqlalchemy import select
        from app.models.order import Order

        builder = OrderQueryBuilder()
        query = select(Order)

        result = builder.apply_export_loading(query)

        assert result is not None


# ============================================================================
# OrderStatusService Tests
# ============================================================================


class TestOrderStatusService:
    """Tests for OrderStatusService status transition and validation logic."""

    def test_get_timestamp_field_assigned(self):
        """Test timestamp field for ASSIGNED status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        field = OrderStatusService.get_timestamp_field(OrderStatus.ASSIGNED)
        assert field == "assigned_at"

    def test_get_timestamp_field_picked_up(self):
        """Test timestamp field for PICKED_UP status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        field = OrderStatusService.get_timestamp_field(OrderStatus.PICKED_UP)
        assert field == "picked_up_at"

    def test_get_timestamp_field_delivered(self):
        """Test timestamp field for DELIVERED status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        field = OrderStatusService.get_timestamp_field(OrderStatus.DELIVERED)
        assert field == "delivered_at"

    def test_get_timestamp_field_no_timestamp(self):
        """Test timestamp field for status without associated timestamp."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        # These statuses don't have associated timestamp fields
        for status in [
            OrderStatus.PENDING,
            OrderStatus.IN_TRANSIT,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.REJECTED,
            OrderStatus.RETURNED,
            OrderStatus.CANCELLED,
        ]:
            field = OrderStatusService.get_timestamp_field(status)
            assert field is None

    def test_can_transition_pending_to_assigned(self):
        """Test valid transition from PENDING to ASSIGNED."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.PENDING, OrderStatus.ASSIGNED
        )

    def test_can_transition_pending_to_cancelled(self):
        """Test valid transition from PENDING to CANCELLED."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.PENDING, OrderStatus.CANCELLED
        )

    def test_can_transition_assigned_to_pending_unassign(self):
        """Test valid transition from ASSIGNED to PENDING (unassign)."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.ASSIGNED, OrderStatus.PENDING
        )

    def test_can_transition_assigned_to_picked_up(self):
        """Test valid transition from ASSIGNED to PICKED_UP."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.ASSIGNED, OrderStatus.PICKED_UP
        )

    def test_can_transition_picked_up_to_in_transit(self):
        """Test valid transition from PICKED_UP to IN_TRANSIT."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT
        )

    def test_can_transition_picked_up_to_out_for_delivery(self):
        """Test valid transition from PICKED_UP to OUT_FOR_DELIVERY."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY
        )

    def test_can_transition_picked_up_to_delivered(self):
        """Test valid transition from PICKED_UP to DELIVERED."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.PICKED_UP, OrderStatus.DELIVERED
        )

    def test_can_transition_out_for_delivery_to_delivered(self):
        """Test valid transition from OUT_FOR_DELIVERY to DELIVERED."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED
        )

    def test_can_transition_out_for_delivery_to_rejected(self):
        """Test valid transition from OUT_FOR_DELIVERY to REJECTED."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.OUT_FOR_DELIVERY, OrderStatus.REJECTED
        )

    def test_can_transition_delivered_to_returned(self):
        """Test valid transition from DELIVERED to RETURNED."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.DELIVERED, OrderStatus.RETURNED
        )

    def test_can_transition_rejected_to_pending(self):
        """Test valid transition from REJECTED to PENDING (reassign)."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.can_transition(
            OrderStatus.REJECTED, OrderStatus.PENDING
        )

    def test_cannot_transition_pending_to_delivered(self):
        """Test invalid transition from PENDING to DELIVERED."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert not OrderStatusService.can_transition(
            OrderStatus.PENDING, OrderStatus.DELIVERED
        )

    def test_cannot_transition_delivered_to_pending(self):
        """Test invalid transition from DELIVERED to PENDING."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert not OrderStatusService.can_transition(
            OrderStatus.DELIVERED, OrderStatus.PENDING
        )

    def test_cannot_transition_cancelled_to_any(self):
        """Test that CANCELLED is a terminal status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        for status in OrderStatus:
            if status != OrderStatus.CANCELLED:
                assert not OrderStatusService.can_transition(
                    OrderStatus.CANCELLED, status
                )

    def test_cannot_transition_returned_to_any(self):
        """Test that RETURNED is a terminal status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        for status in OrderStatus:
            if status != OrderStatus.RETURNED:
                assert not OrderStatusService.can_transition(
                    OrderStatus.RETURNED, status
                )

    def test_can_transition_with_string_status(self):
        """Test can_transition handles string status values."""
        from app.services.order_status import OrderStatusService

        # String statuses should work due to str, enum inheritance
        assert OrderStatusService.can_transition("pending", "assigned")
        assert not OrderStatusService.can_transition("pending", "delivered")

    def test_can_transition_invalid_string_status(self):
        """Test can_transition returns False for invalid string status."""
        from app.services.order_status import OrderStatusService

        assert not OrderStatusService.can_transition("invalid_status", "assigned")
        assert not OrderStatusService.can_transition("pending", "invalid_status")

    def test_is_delivery_ready_picked_up(self):
        """Test is_delivery_ready for PICKED_UP status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.is_delivery_ready(OrderStatus.PICKED_UP)

    def test_is_delivery_ready_in_transit(self):
        """Test is_delivery_ready for IN_TRANSIT status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.is_delivery_ready(OrderStatus.IN_TRANSIT)

    def test_is_delivery_ready_out_for_delivery(self):
        """Test is_delivery_ready for OUT_FOR_DELIVERY status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.is_delivery_ready(OrderStatus.OUT_FOR_DELIVERY)

    def test_is_delivery_ready_pending_false(self):
        """Test is_delivery_ready returns False for PENDING."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert not OrderStatusService.is_delivery_ready(OrderStatus.PENDING)

    def test_is_delivery_ready_assigned_false(self):
        """Test is_delivery_ready returns False for ASSIGNED."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert not OrderStatusService.is_delivery_ready(OrderStatus.ASSIGNED)

    def test_is_delivery_ready_delivered_false(self):
        """Test is_delivery_ready returns False for DELIVERED."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert not OrderStatusService.is_delivery_ready(OrderStatus.DELIVERED)

    def test_is_delivery_ready_with_string(self):
        """Test is_delivery_ready handles string status."""
        from app.services.order_status import OrderStatusService

        assert OrderStatusService.is_delivery_ready("picked_up")
        assert not OrderStatusService.is_delivery_ready("pending")

    def test_is_delivery_ready_invalid_string(self):
        """Test is_delivery_ready returns False for invalid string."""
        from app.services.order_status import OrderStatusService

        assert not OrderStatusService.is_delivery_ready("invalid_status")

    def test_create_status_history(self):
        """Test status history entry creation."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        history = OrderStatusService.create_status_history(
            order_id=1, status=OrderStatus.DELIVERED, notes="Delivered by driver"
        )

        assert history.order_id == 1
        assert history.status == OrderStatus.DELIVERED
        assert history.notes == "Delivered by driver"

    def test_create_status_history_no_notes(self):
        """Test status history entry creation without notes."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        history = OrderStatusService.create_status_history(
            order_id=1, status=OrderStatus.ASSIGNED
        )

        assert history.order_id == 1
        assert history.status == OrderStatus.ASSIGNED
        assert history.notes is None

    def test_apply_status_updates_order(self):
        """Test that apply_status updates order status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import Order, OrderStatus

        # Create a mock order
        order = MagicMock(spec=Order)
        order.id = 1
        order.status = OrderStatus.PENDING

        history = OrderStatusService.apply_status(
            order, OrderStatus.ASSIGNED, notes="Test assignment"
        )

        # Order status should be updated
        assert order.status == OrderStatus.ASSIGNED
        assert history.order_id == 1
        assert history.status == OrderStatus.ASSIGNED
        assert history.notes == "Test assignment"

    def test_apply_assignment(self):
        """Test apply_assignment sets driver and status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import Order, OrderStatus

        order = MagicMock(spec=Order)
        order.id = 1
        order.status = OrderStatus.PENDING
        order.driver_id = None

        history = OrderStatusService.apply_assignment(
            order, driver_id=5, notes="Assigned to driver 5"
        )

        assert order.driver_id == 5
        assert order.status == OrderStatus.ASSIGNED
        assert history.order_id == 1
        assert history.status == OrderStatus.ASSIGNED

    def test_apply_unassignment(self):
        """Test apply_unassignment removes driver and resets status."""
        from app.services.order_status import OrderStatusService
        from app.models.order import Order, OrderStatus

        order = MagicMock(spec=Order)
        order.id = 1
        order.status = OrderStatus.ASSIGNED
        order.driver_id = 5
        order.assigned_at = datetime.now(timezone.utc)

        history = OrderStatusService.apply_unassignment(order)

        assert order.driver_id is None
        assert order.status == OrderStatus.PENDING
        assert order.assigned_at is None
        assert history.order_id == 1
        assert history.status == OrderStatus.PENDING
        assert "Unassigned" in history.notes

    def test_get_status_display_name(self):
        """Test status display name mapping."""
        from app.services.order_status import OrderStatusService
        from app.models.order import OrderStatus

        assert OrderStatusService.get_status_display_name(OrderStatus.PENDING) == "Pending"
        assert OrderStatusService.get_status_display_name(OrderStatus.ASSIGNED) == "Assigned"
        assert (
            OrderStatusService.get_status_display_name(OrderStatus.PICKED_UP)
            == "Picked Up"
        )
        assert (
            OrderStatusService.get_status_display_name(OrderStatus.IN_TRANSIT)
            == "In Transit"
        )
        assert (
            OrderStatusService.get_status_display_name(OrderStatus.OUT_FOR_DELIVERY)
            == "Out for Delivery"
        )
        assert (
            OrderStatusService.get_status_display_name(OrderStatus.DELIVERED)
            == "Delivered"
        )
        assert (
            OrderStatusService.get_status_display_name(OrderStatus.REJECTED) == "Rejected"
        )
        assert (
            OrderStatusService.get_status_display_name(OrderStatus.RETURNED) == "Returned"
        )
        assert (
            OrderStatusService.get_status_display_name(OrderStatus.CANCELLED)
            == "Cancelled"
        )


# ============================================================================
# Order Assignment Tests
# ============================================================================


class TestOrderAssignment:
    """Tests for order assignment service functions."""

    @pytest.mark.asyncio
    async def test_get_driver_with_user_not_found(self):
        """Test get_driver_with_user raises exception when driver not found."""
        from app.services.order_assignment import get_driver_with_user
        from app.core.exceptions import DriverNotFoundException

        # Mock database session
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = mock_result

        with pytest.raises(DriverNotFoundException):
            await get_driver_with_user(mock_db, driver_id=999)

    @pytest.mark.asyncio
    async def test_get_driver_with_user_found(self):
        """Test get_driver_with_user returns driver when found."""
        from app.services.order_assignment import get_driver_with_user
        from app.models.driver import Driver

        # Mock database session
        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = 1

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_driver
        mock_db.execute.return_value = mock_result

        result = await get_driver_with_user(mock_db, driver_id=1)
        assert result is mock_driver

    @pytest.mark.asyncio
    async def test_validate_driver_availability_inactive(self):
        """Test validate_driver_availability raises exception for inactive driver."""
        from app.services.order_assignment import validate_driver_availability
        from app.core.exceptions import DriverNotAvailableException
        from app.models.driver import Driver
        from app.models.user import User

        mock_user = MagicMock(spec=User)
        mock_user.is_active = False

        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = 1
        mock_driver.user = mock_user

        with pytest.raises(DriverNotAvailableException):
            await validate_driver_availability(mock_driver)

    @pytest.mark.asyncio
    async def test_validate_driver_availability_active(self):
        """Test validate_driver_availability passes for active driver."""
        from app.services.order_assignment import validate_driver_availability
        from app.models.driver import Driver
        from app.models.user import User

        mock_user = MagicMock(spec=User)
        mock_user.is_active = True

        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = 1
        mock_driver.user = mock_user

        # Should not raise
        await validate_driver_availability(mock_driver)

    @pytest.mark.asyncio
    async def test_assign_order_success(self):
        """Test successful order assignment."""
        from app.services.order_assignment import assign_order
        from app.models.order import Order, OrderStatus
        from app.models.driver import Driver
        from app.models.user import User

        # Mock user
        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.is_active = True
        mock_user.fcm_token = "test_token"
        mock_user.full_name = "Test Driver"
        mock_user.email = "driver@test.com"
        mock_user.user_id = 1

        # Mock driver
        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = 5
        mock_driver.user = mock_user
        mock_driver.user_id = 1

        # Mock order
        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.status = OrderStatus.PENDING
        mock_order.driver = None
        mock_order.driver_id = None
        mock_order.sales_order_number = "SO-001"

        # Mock assigned_by user
        mock_assigner = MagicMock(spec=User)
        mock_assigner.id = 10
        mock_assigner.full_name = "Manager"
        mock_assigner.email = "manager@test.com"

        # Mock database
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_driver
        mock_db.execute.return_value = mock_result

        # Mock notification service
        with patch(
            "app.services.order_assignment.notification_service"
        ) as mock_notif:
            mock_notif.notify_driver_new_orders = AsyncMock()
            mock_notif.notify_admins_order_assigned = AsyncMock()

            result = await assign_order(
                mock_db, mock_order, driver_id=5, assigned_by=mock_assigner
            )

            assert result is mock_order
            assert mock_order.driver_id == 5
            mock_db.add.assert_called()
            mock_db.flush.assert_called()

    @pytest.mark.asyncio
    async def test_unassign_order(self):
        """Test order unassignment."""
        from app.services.order_assignment import unassign_order
        from app.models.order import Order, OrderStatus

        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.status = OrderStatus.ASSIGNED
        mock_order.driver_id = 5
        mock_order.assigned_at = datetime.now(timezone.utc)

        mock_db = AsyncMock()

        result = await unassign_order(mock_db, mock_order)

        assert result is mock_order
        assert mock_order.driver_id is None
        assert mock_order.status == OrderStatus.PENDING
        mock_db.add.assert_called()

    @pytest.mark.asyncio
    async def test_batch_assign_orders(self):
        """Test batch order assignment."""
        from app.services.order_assignment import batch_assign_orders
        from app.models.order import Order, OrderStatus
        from app.models.driver import Driver
        from app.models.user import User

        # Mock user and driver
        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.is_active = True
        mock_user.fcm_token = "token"
        mock_user.user_id = 1

        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = 5
        mock_driver.user = mock_user
        mock_driver.user_id = 1

        # Mock orders
        mock_order1 = MagicMock(spec=Order)
        mock_order1.id = 1
        mock_order1.warehouse_id = 1
        mock_order1.status = OrderStatus.PENDING

        mock_order2 = MagicMock(spec=Order)
        mock_order2.id = 2
        mock_order2.warehouse_id = 1
        mock_order2.status = OrderStatus.PENDING

        # Mock assigner
        mock_assigner = MagicMock(spec=User)
        mock_assigner.id = 10
        mock_assigner.full_name = "Manager"
        mock_assigner.email = "manager@test.com"

        # Mock database
        mock_db = AsyncMock()

        # Create result mocks for orders and drivers queries
        orders_result = MagicMock()
        orders_result.scalars.return_value.all.return_value = [mock_order1, mock_order2]

        drivers_result = MagicMock()
        drivers_result.scalars.return_value.all.return_value = [mock_driver]

        admin_result = MagicMock()
        admin_result.scalars.return_value.all.return_value = []

        mock_db.execute.side_effect = [orders_result, drivers_result, admin_result]

        # Mock notification service
        with patch(
            "app.services.order_assignment.notification_service"
        ) as mock_notif:
            mock_notif.notify_driver_new_orders = AsyncMock()

            assignments = [
                {"order_id": 1, "driver_id": 5},
                {"order_id": 2, "driver_id": 5},
            ]

            result = await batch_assign_orders(
                mock_db,
                assignments,
                assigned_by=mock_assigner,
                user_warehouse_ids=[1],
            )

            assert result["assigned"] == 2

    @pytest.mark.asyncio
    async def test_batch_assign_orders_warehouse_access_denied(self):
        """Test batch assignment respects warehouse access."""
        from app.services.order_assignment import batch_assign_orders
        from app.models.order import Order, OrderStatus
        from app.models.driver import Driver
        from app.models.user import User

        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.is_active = True
        mock_user.fcm_token = None
        mock_user.user_id = 1

        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = 5
        mock_driver.user = mock_user
        mock_driver.user_id = 1

        # Order in warehouse 2, but user only has access to warehouse 1
        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.warehouse_id = 2
        mock_order.status = OrderStatus.PENDING

        mock_assigner = MagicMock(spec=User)
        mock_assigner.id = 10
        mock_assigner.full_name = "Manager"
        mock_assigner.email = "manager@test.com"

        mock_db = AsyncMock()
        orders_result = MagicMock()
        orders_result.scalars.return_value.all.return_value = [mock_order]

        drivers_result = MagicMock()
        drivers_result.scalars.return_value.all.return_value = [mock_driver]

        mock_db.execute.side_effect = [orders_result, drivers_result]

        with patch(
            "app.services.order_assignment.notification_service"
        ) as mock_notif:
            mock_notif.notify_driver_new_orders = AsyncMock()

            assignments = [{"order_id": 1, "driver_id": 5}]

            result = await batch_assign_orders(
                mock_db,
                assignments,
                assigned_by=mock_assigner,
                user_warehouse_ids=[1],  # Only has access to warehouse 1
            )

            # Should not assign because warehouse access is denied
            assert result["assigned"] == 0


# ============================================================================
# ProofOfDeliveryService Tests
# ============================================================================


class TestProofOfDeliveryService:
    """Tests for ProofOfDeliveryService."""

    def test_validate_pod_urls_valid_http(self):
        """Test URL validation for valid HTTP URLs."""
        from app.services.proof_of_delivery import ProofOfDeliveryService

        service = ProofOfDeliveryService()
        result = service.validate_pod_urls(
            photo_url="https://example.com/photo.jpg",
            signature_url="https://example.com/signature.png",
        )

        assert result["valid"] is True
        assert len(result["errors"]) == 0

    def test_validate_pod_urls_valid_data_url(self):
        """Test URL validation for data URL (base64 signature)."""
        from app.services.proof_of_delivery import ProofOfDeliveryService

        service = ProofOfDeliveryService()
        result = service.validate_pod_urls(
            signature_url="data:image/png;base64,iVBORw0KGgo..."
        )

        assert result["valid"] is True
        assert len(result["errors"]) == 0

    def test_validate_pod_urls_invalid_photo(self):
        """Test URL validation for invalid photo URL."""
        from app.services.proof_of_delivery import ProofOfDeliveryService

        service = ProofOfDeliveryService()
        result = service.validate_pod_urls(photo_url="not-a-valid-url")

        assert result["valid"] is False
        assert "Invalid photo URL format" in result["errors"]

    def test_validate_pod_urls_invalid_signature(self):
        """Test URL validation for invalid signature URL."""
        from app.services.proof_of_delivery import ProofOfDeliveryService

        service = ProofOfDeliveryService()
        result = service.validate_pod_urls(signature_url="not-a-valid-url")

        assert result["valid"] is False
        assert "Invalid signature URL format" in result["errors"]

    def test_validate_pod_urls_both_invalid(self):
        """Test URL validation for both invalid URLs."""
        from app.services.proof_of_delivery import ProofOfDeliveryService

        service = ProofOfDeliveryService()
        result = service.validate_pod_urls(
            photo_url="invalid", signature_url="also-invalid"
        )

        assert result["valid"] is False
        assert len(result["errors"]) == 2

    def test_validate_pod_urls_empty(self):
        """Test URL validation with no URLs."""
        from app.services.proof_of_delivery import ProofOfDeliveryService

        service = ProofOfDeliveryService()
        result = service.validate_pod_urls()

        assert result["valid"] is True
        assert len(result["errors"]) == 0

    @pytest.mark.asyncio
    async def test_upload_photo(self):
        """Test photo upload to storage."""
        from app.services.proof_of_delivery import ProofOfDeliveryService

        service = ProofOfDeliveryService()

        with patch(
            "app.services.proof_of_delivery.storage_service"
        ) as mock_storage:
            mock_storage.upload_file = AsyncMock(
                return_value="https://storage.example.com/photo.jpg"
            )

            result = await service.upload_photo(
                order_id=1,
                photo_content=b"test photo content",
                content_type="image/jpeg",
            )

            assert result == "https://storage.example.com/photo.jpg"
            mock_storage.upload_file.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_photo_failure(self):
        """Test photo upload failure returns None."""
        from app.services.proof_of_delivery import ProofOfDeliveryService

        service = ProofOfDeliveryService()

        with patch(
            "app.services.proof_of_delivery.storage_service"
        ) as mock_storage:
            mock_storage.upload_file = AsyncMock(return_value=None)

            result = await service.upload_photo(
                order_id=1,
                photo_content=b"test photo content",
            )

            assert result is None

    def test_create_or_update_pod_create_new(self):
        """Test creating new POD record."""
        from app.services.proof_of_delivery import ProofOfDeliveryService
        from app.models.order import Order

        service = ProofOfDeliveryService()

        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.proof_of_delivery = None

        mock_db = AsyncMock()

        pod = service.create_or_update_pod(
            mock_db,
            mock_order,
            photo_url="https://example.com/photo.jpg",
            signature_url="https://example.com/sig.png",
        )

        assert pod.order_id == 1
        assert pod.photo_url == "https://example.com/photo.jpg"
        assert pod.signature_url == "https://example.com/sig.png"
        mock_db.add.assert_called_once()

    def test_create_or_update_pod_update_existing(self):
        """Test updating existing POD record."""
        from app.services.proof_of_delivery import ProofOfDeliveryService
        from app.models.order import Order, ProofOfDelivery

        service = ProofOfDeliveryService()

        mock_pod = MagicMock(spec=ProofOfDelivery)
        mock_pod.order_id = 1
        mock_pod.photo_url = "old_photo.jpg"
        mock_pod.signature_url = "old_sig.png"

        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.proof_of_delivery = mock_pod

        mock_db = AsyncMock()

        result = service.create_or_update_pod(
            mock_db,
            mock_order,
            photo_url="https://example.com/new_photo.jpg",
        )

        assert result is mock_pod
        assert mock_pod.photo_url == "https://example.com/new_photo.jpg"
        # Signature should not be changed
        assert mock_pod.signature_url == "old_sig.png"

    @pytest.mark.asyncio
    async def test_complete_delivery(self):
        """Test completing delivery with POD."""
        from app.services.proof_of_delivery import ProofOfDeliveryService
        from app.models.order import Order, OrderStatus

        service = ProofOfDeliveryService()

        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.status = OrderStatus.OUT_FOR_DELIVERY
        mock_order.proof_of_delivery = None

        mock_db = AsyncMock()

        await service.complete_delivery(
            mock_db,
            mock_order,
            photo_url="https://example.com/photo.jpg",
            notes="Delivered successfully",
        )

        assert mock_order.status == OrderStatus.DELIVERED
        mock_db.add.assert_called()

    @pytest.mark.asyncio
    async def test_complete_delivery_without_pod(self):
        """Test completing delivery without POD (optional POD)."""
        from app.services.proof_of_delivery import ProofOfDeliveryService
        from app.models.order import Order, OrderStatus

        service = ProofOfDeliveryService()

        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.status = OrderStatus.OUT_FOR_DELIVERY
        mock_order.proof_of_delivery = None

        mock_db = AsyncMock()

        await service.complete_delivery(mock_db, mock_order)

        assert mock_order.status == OrderStatus.DELIVERED

    @pytest.mark.asyncio
    async def test_process_post_delivery_with_notifications(self):
        """Test post-delivery processing sends notifications."""
        from app.services.proof_of_delivery import ProofOfDeliveryService
        from app.models.order import Order
        from app.models.driver import Driver
        from app.models.user import User

        service = ProofOfDeliveryService()

        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.fcm_token = "test_token"

        mock_driver = MagicMock(spec=Driver)
        mock_driver.user = mock_user
        mock_driver.user_id = 1

        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.driver = mock_driver
        mock_order.driver_id = 1
        mock_order.payment_method = "CASH"
        mock_order.total_amount = 25.5

        mock_db = AsyncMock()

        # Mock existing payment check
        payment_result = MagicMock()
        payment_result.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = payment_result

        with patch(
            "app.services.proof_of_delivery.notification_service"
        ) as mock_notif:
            mock_notif.notify_driver_order_delivered = AsyncMock()
            mock_notif.notify_driver_payment_collected = AsyncMock()

            await service.process_post_delivery(mock_db, mock_order)

            mock_notif.notify_driver_order_delivered.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_post_delivery_no_driver(self):
        """Test post-delivery processing with no driver assigned."""
        from app.services.proof_of_delivery import ProofOfDeliveryService
        from app.models.order import Order

        service = ProofOfDeliveryService()

        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.driver = None

        mock_db = AsyncMock()

        # Should not raise, just return early
        await service.process_post_delivery(mock_db, mock_order)

    @pytest.mark.asyncio
    async def test_create_payment_collection_cod(self):
        """Test payment collection creation for COD orders."""
        from app.services.proof_of_delivery import ProofOfDeliveryService
        from app.models.order import Order
        from app.models.driver import Driver
        from app.models.user import User

        service = ProofOfDeliveryService()

        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.fcm_token = "token"

        mock_driver = MagicMock(spec=Driver)
        mock_driver.user = mock_user
        mock_driver.user_id = 1

        mock_order = MagicMock(spec=Order)
        mock_order.id = 1
        mock_order.driver = mock_driver
        mock_order.driver_id = 1
        mock_order.payment_method = "CASH"
        mock_order.total_amount = 50.0

        mock_db = AsyncMock()

        # No existing payment
        payment_result = MagicMock()
        payment_result.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = payment_result

        with patch(
            "app.services.proof_of_delivery.notification_service"
        ) as mock_notif:
            mock_notif.notify_driver_payment_collected = AsyncMock()

            await service._create_payment_collection(mock_db, mock_order)

            # Payment should be added
            mock_db.add.assert_called()

    @pytest.mark.asyncio
    async def test_create_payment_collection_already_exists(self):
        """Test payment collection skipped if already exists."""
        from app.services.proof_of_delivery import ProofOfDeliveryService
        from app.models.order import Order
        from app.models.financial import PaymentCollection

        service = ProofOfDeliveryService()

        mock_order = MagicMock(spec=Order)
        mock_order.id = 1

        mock_existing_payment = MagicMock(spec=PaymentCollection)

        mock_db = AsyncMock()
        payment_result = MagicMock()
        payment_result.scalars.return_value.first.return_value = mock_existing_payment
        mock_db.execute.return_value = payment_result

        await service._create_payment_collection(mock_db, mock_order)

        # Should not add new payment
        mock_db.add.assert_not_called()


# ============================================================================
# Integration-style tests for service constants
# ============================================================================


class TestServiceConstants:
    """Tests for service constants and configuration."""

    def test_date_field_whitelist(self):
        """Test DATE_FIELD_WHITELIST contains expected fields."""
        from app.services.order_query import DATE_FIELD_WHITELIST

        expected_fields = ["created_at", "assigned_at", "picked_up_at", "delivered_at"]
        for field in expected_fields:
            assert field in DATE_FIELD_WHITELIST

    def test_sort_columns_whitelist(self):
        """Test SORT_COLUMNS contains expected columns."""
        from app.services.order_query import SORT_COLUMNS

        expected_columns = [
            "created_at",
            "updated_at",
            "sales_order_number",
            "status",
            "total_amount",
            "assigned_at",
            "picked_up_at",
            "delivered_at",
            "payment_method",
            "sales_taker",
            "customer_name",
            "customer_phone",
        ]
        for col in expected_columns:
            assert col in SORT_COLUMNS

    def test_valid_transitions_complete(self):
        """Test VALID_TRANSITIONS covers all statuses."""
        from app.services.order_status import VALID_TRANSITIONS
        from app.models.order import OrderStatus

        for status in OrderStatus:
            assert status in VALID_TRANSITIONS

    def test_delivery_ready_statuses(self):
        """Test DELIVERY_READY_STATUSES contains correct statuses."""
        from app.services.order_status import DELIVERY_READY_STATUSES
        from app.models.order import OrderStatus

        assert OrderStatus.PICKED_UP in DELIVERY_READY_STATUSES
        assert OrderStatus.IN_TRANSIT in DELIVERY_READY_STATUSES
        assert OrderStatus.OUT_FOR_DELIVERY in DELIVERY_READY_STATUSES
        assert OrderStatus.PENDING not in DELIVERY_READY_STATUSES
        assert OrderStatus.ASSIGNED not in DELIVERY_READY_STATUSES
        assert OrderStatus.DELIVERED not in DELIVERY_READY_STATUSES

    def test_status_timestamp_fields(self):
        """Test STATUS_TIMESTAMP_FIELDS mapping."""
        from app.services.order_status import STATUS_TIMESTAMP_FIELDS
        from app.models.order import OrderStatus

        assert STATUS_TIMESTAMP_FIELDS[OrderStatus.ASSIGNED] == "assigned_at"
        assert STATUS_TIMESTAMP_FIELDS[OrderStatus.PICKED_UP] == "picked_up_at"
        assert STATUS_TIMESTAMP_FIELDS[OrderStatus.DELIVERED] == "delivered_at"

        # These should not be in the mapping
        assert OrderStatus.PENDING not in STATUS_TIMESTAMP_FIELDS
        assert OrderStatus.IN_TRANSIT not in STATUS_TIMESTAMP_FIELDS
        assert OrderStatus.CANCELLED not in STATUS_TIMESTAMP_FIELDS
