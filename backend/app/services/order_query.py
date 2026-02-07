"""
Order Query Builder Service

Centralizes order query building logic for filtering, sorting, and pagination.
Used by read_orders and export_orders endpoints to avoid code duplication.
"""

from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import select, func, desc, asc, cast, String, or_, exists
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import Select

from app.models.order import Order
from app.models.driver import Driver
from app.models.user import User
from app.models.warehouse import Warehouse


# Whitelisted date fields for filtering
DATE_FIELD_WHITELIST = {
    "created_at": Order.created_at,
    "assigned_at": Order.assigned_at,
    "picked_up_at": Order.picked_up_at,
    "delivered_at": Order.delivered_at,
}

# Whitelisted columns for sorting
SORT_COLUMNS = {
    "created_at": Order.created_at,
    "updated_at": Order.updated_at,
    "sales_order_number": Order.sales_order_number,
    "status": Order.status,
    "total_amount": Order.total_amount,
    "assigned_at": Order.assigned_at,
    "picked_up_at": Order.picked_up_at,
    "delivered_at": Order.delivered_at,
    "payment_method": Order.payment_method,
    "sales_taker": Order.sales_taker,
    "customer_name": cast(Order.customer_info["name"], String),
    "customer_phone": cast(Order.customer_info["phone"], String),
}


class OrderQueryBuilder:
    """
    Builds SQLAlchemy queries for orders with filtering, sorting, and pagination.

    Usage:
        builder = OrderQueryBuilder()
        builder.with_warehouse_access(warehouse_ids)
        builder.with_status("pending")
        builder.with_date_range(date_from="2024-01-01", date_to="2024-01-31")
        query, count_query = builder.build()
    """

    def __init__(self):
        self._filters: List = []
        self._sort_by: Optional[str] = None
        self._sort_order: str = "desc"

    def with_warehouse_access(self, warehouse_ids: Optional[List[int]]) -> "OrderQueryBuilder":
        """
        Filter by warehouse access. Pass None for super_admin (all access).
        Returns empty filter list if warehouse_ids is empty (user has no access).
        """
        if warehouse_ids is not None and len(warehouse_ids) > 0:
            self._filters.append(Order.warehouse_id.in_(warehouse_ids))
        return self

    def with_archive_filter(self, include_archived: bool) -> "OrderQueryBuilder":
        """Filter by archive status. When True, show only archived; when False, show only non-archived."""
        self._filters.append(Order.is_archived.is_(include_archived))
        return self

    def with_status(self, status: Optional[str]) -> "OrderQueryBuilder":
        """Filter by order status."""
        if status:
            self._filters.append(Order.status == status)
        return self

    def with_warehouse_id(self, warehouse_id: Optional[int]) -> "OrderQueryBuilder":
        """Filter by specific warehouse ID."""
        if warehouse_id:
            self._filters.append(Order.warehouse_id == warehouse_id)
        return self

    def with_driver_id(self, driver_id: Optional[int]) -> "OrderQueryBuilder":
        """Filter by driver ID."""
        if driver_id:
            self._filters.append(Order.driver_id == driver_id)
        return self

    def with_customer_name(self, customer_name: Optional[str]) -> "OrderQueryBuilder":
        """Filter by customer name (partial match)."""
        if customer_name:
            self._filters.append(
                cast(Order.customer_info["name"], String).ilike(f"%{customer_name}%")
            )
        return self

    def with_customer_phone(self, customer_phone: Optional[str]) -> "OrderQueryBuilder":
        """Filter by customer phone (partial match)."""
        if customer_phone:
            self._filters.append(
                cast(Order.customer_info["phone"], String).ilike(f"%{customer_phone}%")
            )
        return self

    def with_customer_address(self, customer_address: Optional[str]) -> "OrderQueryBuilder":
        """Filter by customer address (partial match)."""
        if customer_address:
            self._filters.append(
                cast(Order.customer_info["address"], String).ilike(f"%{customer_address}%")
            )
        return self

    def with_order_number(self, order_number: Optional[str]) -> "OrderQueryBuilder":
        """Filter by sales order number (partial match)."""
        if order_number:
            self._filters.append(Order.sales_order_number.ilike(f"%{order_number}%"))
        return self

    def with_driver_name(self, driver_name: Optional[str]) -> "OrderQueryBuilder":
        """Filter by driver's full name (partial match via subquery)."""
        if driver_name:
            driver_name_subq = (
                select(Driver.id)
                .join(User, Driver.user_id == User.id)
                .where(Driver.id == Order.driver_id, User.full_name.ilike(f"%{driver_name}%"))
            )
            self._filters.append(exists(driver_name_subq))
        return self

    def with_driver_code(self, driver_code: Optional[str]) -> "OrderQueryBuilder":
        """Filter by driver code (partial match via subquery)."""
        if driver_code:
            driver_code_subq = (
                select(Driver.id)
                .where(Driver.id == Order.driver_id, Driver.code.ilike(f"%{driver_code}%"))
            )
            self._filters.append(exists(driver_code_subq))
        return self

    def with_sales_taker(self, sales_taker: Optional[str]) -> "OrderQueryBuilder":
        """Filter by sales taker (partial match)."""
        if sales_taker:
            self._filters.append(Order.sales_taker.ilike(f"%{sales_taker}%"))
        return self

    def with_payment_method(self, payment_method: Optional[str]) -> "OrderQueryBuilder":
        """Filter by payment method (partial match)."""
        if payment_method:
            self._filters.append(Order.payment_method.ilike(f"%{payment_method}%"))
        return self

    def with_date_range(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        date_field: Optional[str] = "created_at",
    ) -> "OrderQueryBuilder":
        """Filter by date range on a specified date field."""
        if date_from or date_to:
            date_col = DATE_FIELD_WHITELIST.get(date_field, Order.created_at)
            if date_from:
                try:
                    from_dt = datetime.fromisoformat(date_from)
                    self._filters.append(date_col >= from_dt)
                except ValueError:
                    pass
            if date_to:
                try:
                    to_dt = datetime.fromisoformat(date_to)
                    # Add a day to make "to" date inclusive
                    to_dt = to_dt.replace(hour=23, minute=59, second=59)
                    self._filters.append(date_col <= to_dt)
                except ValueError:
                    pass
        return self

    def with_universal_search(self, search: Optional[str]) -> "OrderQueryBuilder":
        """
        Universal search across multiple fields:
        order#, customer info, status, notes, sales_taker, amount, driver, warehouse.
        """
        if search:
            search_filter = f"%{search}%"
            search_conditions = [
                Order.sales_order_number.ilike(search_filter),
                cast(Order.customer_info["name"], String).ilike(search_filter),
                cast(Order.customer_info["phone"], String).ilike(search_filter),
                cast(Order.customer_info["address"], String).ilike(search_filter),
                cast(Order.customer_info["area"], String).ilike(search_filter),
                Order.status.ilike(search_filter),
                Order.notes.ilike(search_filter),
                Order.sales_taker.ilike(search_filter),
            ]

            # Search by amount (exact or partial match)
            try:
                amount_val = float(search)
                search_conditions.append(Order.total_amount == amount_val)
            except (ValueError, TypeError):
                pass

            # Join-based search for driver name/phone/code
            driver_subq = (
                select(Driver.id)
                .join(User, Driver.user_id == User.id)
                .where(
                    Driver.id == Order.driver_id,
                    or_(
                        User.full_name.ilike(search_filter),
                        User.phone.ilike(search_filter),
                        Driver.code.ilike(search_filter),
                    ),
                )
            )
            search_conditions.append(exists(driver_subq))

            # Warehouse code search
            wh_subq = (
                select(Warehouse.id).where(
                    Warehouse.id == Order.warehouse_id,
                    Warehouse.code.ilike(search_filter),
                )
            )
            search_conditions.append(exists(wh_subq))

            self._filters.append(or_(*search_conditions))
        return self

    def with_sorting(
        self, sort_by: Optional[str] = None, sort_order: str = "desc"
    ) -> "OrderQueryBuilder":
        """Set sorting column and order."""
        self._sort_by = sort_by
        self._sort_order = sort_order
        return self

    def _get_sort_column(self):
        """Get the sort column, handling subquery-based sorts."""
        subquery_sorts = {
            "driver_name": (
                select(User.full_name)
                .join(Driver, Driver.user_id == User.id)
                .where(Driver.id == Order.driver_id)
                .correlate(Order)
                .scalar_subquery()
            ),
            "driver_code": (
                select(Driver.code)
                .where(Driver.id == Order.driver_id)
                .correlate(Order)
                .scalar_subquery()
            ),
            "warehouse_code": (
                select(Warehouse.code)
                .where(Warehouse.id == Order.warehouse_id)
                .correlate(Order)
                .scalar_subquery()
            ),
        }

        if self._sort_by in subquery_sorts:
            return subquery_sorts[self._sort_by]
        return SORT_COLUMNS.get(self._sort_by, Order.created_at)

    def build(self) -> Tuple[Select, Select]:
        """
        Build and return the query and count query with all filters applied.
        Returns: (query, count_query)
        """
        query = select(Order)
        count_query = select(func.count()).select_from(Order)

        if self._filters:
            query = query.where(*self._filters)
            count_query = count_query.where(*self._filters)

        return query, count_query

    def build_with_pagination(
        self, page: int, limit: int
    ) -> Tuple[Select, Select, int]:
        """
        Build query with sorting and pagination applied.
        Returns: (query, count_query, skip)
        """
        query, count_query = self.build()

        # Apply sorting
        sort_column = self._get_sort_column()
        order_func = asc if self._sort_order == "asc" else desc
        query = query.order_by(order_func(sort_column))

        # Apply pagination
        skip = (page - 1) * limit
        query = query.offset(skip).limit(limit)

        return query, count_query, skip

    def apply_eager_loading(self, query: Select) -> Select:
        """Apply standard eager loading for order list queries."""
        return query.options(
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
            selectinload(Order.warehouse),
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.driver).selectinload(Driver.warehouse),
        )

    def apply_export_loading(self, query: Select) -> Select:
        """Apply eager loading for export queries (fewer relations needed)."""
        return query.options(
            selectinload(Order.warehouse),
            selectinload(Order.driver).selectinload(Driver.user),
        )


# Singleton instance
order_query_builder = OrderQueryBuilder
