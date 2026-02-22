from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, delete, cast, String, or_, exists
from sqlalchemy.orm import selectinload
from math import ceil

from app.api import deps
from app.models.order import Order, OrderStatus, OrderStatusHistory, ProofOfDelivery
from app.models.user import User
from app.models.driver import Driver
from app.models.warehouse import Warehouse
from app.models.financial import PaymentCollection
from geoalchemy2.elements import WKTElement
from app.schemas.order import (
    Order as OrderSchema,
    OrderCreate,
)
from app.services.excel import excel_service
from app.services.notification import notification_service
from app.services import order_assignment as assignment_service
from app.services.order_status import order_status_service
from app.services.proof_of_delivery import pod_service
from app.core.exceptions import DriverNotFoundException, DriverNotAvailableException
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class PaginatedOrderResponse(BaseModel):
    items: List[OrderSchema]
    total: int
    page: int
    size: int
    pages: int


@router.get("", response_model=PaginatedOrderResponse)
async def read_orders(
    db: AsyncSession = Depends(deps.get_db),
    page: int = 1,
    limit: int = 10,
    status: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    search: Optional[str] = None,
    include_archived: bool = False,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
    # Field-specific search filters
    customer_name: Optional[str] = None,
    customer_phone: Optional[str] = None,
    customer_address: Optional[str] = None,
    order_number: Optional[str] = None,
    driver_name: Optional[str] = None,
    driver_code: Optional[str] = None,
    sales_taker: Optional[str] = None,
    payment_method: Optional[str] = None,
    # Date range filters
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    date_field: Optional[str] = "created_at",
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve orders with pagination.
    By default, archived orders are excluded. Set include_archived=True to see all orders.

    SECURITY: Users can only see orders from warehouses they have access to.
    Super admins can see all orders.
    """
    # Build query
    query = select(Order)
    count_query = select(func.count()).select_from(Order)

    filters = []

    # SECURITY: Enforce warehouse-level access control
    user_warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)
    if user_warehouse_ids is not None:  # None means super_admin (all access)
        if len(user_warehouse_ids) == 0:
            # User has no warehouse access - return empty result
            return {
                "items": [],
                "total": 0,
                "page": page,
                "size": limit,
                "pages": 0,
            }
        # Filter to only user's warehouses
        filters.append(Order.warehouse_id.in_(user_warehouse_ids))

    # Archive filter - toggle between archived and non-archived orders
    # When include_archived=True, show ONLY archived orders
    # When include_archived=False (default), show ONLY non-archived orders
    filters.append(Order.is_archived.is_(include_archived))

    if status:
        filters.append(Order.status == status)
    if warehouse_id:
        # Additional warehouse filter (must be within user's allowed warehouses)
        if user_warehouse_ids is None or warehouse_id in user_warehouse_ids:
            filters.append(Order.warehouse_id == warehouse_id)
        else:
            # User requested a warehouse they don't have access to
            raise HTTPException(
                status_code=403,
                detail="You don't have access to orders from this warehouse",
            )
    if driver_id:
        filters.append(Order.driver_id == driver_id)

    # Field-specific text filters (AND logic - each narrows results)
    if customer_name:
        filters.append(
            cast(Order.customer_info["name"], String).ilike(f"%{customer_name}%")
        )
    if customer_phone:
        filters.append(
            cast(Order.customer_info["phone"], String).ilike(f"%{customer_phone}%")
        )
    if customer_address:
        filters.append(
            cast(Order.customer_info["address"], String).ilike(f"%{customer_address}%")
        )
    if order_number:
        filters.append(Order.sales_order_number.ilike(f"%{order_number}%"))
    if driver_name:
        driver_name_subq = (
            select(Driver.id)
            .join(User, Driver.user_id == User.id)
            .where(
                Driver.id == Order.driver_id, User.full_name.ilike(f"%{driver_name}%")
            )
        )
        filters.append(exists(driver_name_subq))
    if driver_code:
        driver_code_subq = select(Driver.id).where(
            Driver.id == Order.driver_id, Driver.code.ilike(f"%{driver_code}%")
        )
        filters.append(exists(driver_code_subq))
    if sales_taker:
        filters.append(Order.sales_taker.ilike(f"%{sales_taker}%"))
    if payment_method:
        filters.append(Order.payment_method.ilike(f"%{payment_method}%"))

    # Date range filters
    if date_from or date_to:
        DATE_FIELD_WHITELIST = {
            "created_at": Order.created_at,
            "assigned_at": Order.assigned_at,
            "picked_up_at": Order.picked_up_at,
            "delivered_at": Order.delivered_at,
        }
        date_col = DATE_FIELD_WHITELIST.get(date_field, Order.created_at)
        if date_from:
            try:
                from_dt = datetime.fromisoformat(date_from)
                filters.append(date_col >= from_dt)
            except ValueError:
                pass
        if date_to:
            try:
                to_dt = datetime.fromisoformat(date_to)
                # Add a day to make "to" date inclusive
                to_dt = to_dt.replace(hour=23, minute=59, second=59)
                filters.append(date_col <= to_dt)
            except ValueError:
                pass

    if search:
        search_filter = f"%{search}%"
        # Universal search: order#, customer info, status, warehouse code, driver name/phone/code, notes, sales_taker, amount
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

        # Join-based search for driver name/phone/code and warehouse code
        # These use exists() subqueries to avoid changing the main query join semantics
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

        wh_subq = select(Warehouse.id).where(
            Warehouse.id == Order.warehouse_id,
            Warehouse.code.ilike(search_filter),
        )
        search_conditions.append(exists(wh_subq))

        filters.append(or_(*search_conditions))

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination logic
    skip = (page - 1) * limit
    pages = ceil(total / limit) if limit > 0 else 1

    # Sorting with whitelist validation
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

    # Handle sort columns that require subqueries (driver_name, driver_code, warehouse_code)
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

    if sort_by in subquery_sorts:
        sort_column = subquery_sorts[sort_by]
    else:
        sort_column = SORT_COLUMNS.get(sort_by, Order.created_at)
    order_func = asc if sort_order == "asc" else desc

    # Get items
    query = (
        query.options(
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
            selectinload(Order.warehouse),
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.driver).selectinload(Driver.warehouse),
        )
        .order_by(order_func(sort_column))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    orders = result.scalars().all()

    return {
        "items": orders,
        "total": total,
        "page": page,
        "size": limit,
        "pages": pages,
    }


@router.get("/{order_id}", response_model=OrderSchema)
async def read_order(
    order_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get order details.

    SECURITY: Users can only access orders from warehouses they have access to,
    OR orders that are assigned to them (for drivers).
    """
    from app.models.user import UserRole

    query = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
            selectinload(Order.warehouse),
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.driver).selectinload(Driver.warehouse),
        )
    )
    result = await db.execute(query)
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # SECURITY: Enforce access control
    # Super admins have full access (handled by get_user_warehouse_ids returning None)
    user_warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)

    if user_warehouse_ids is not None:  # None means super_admin (all access)
        has_warehouse_access = order.warehouse_id in user_warehouse_ids

        # Drivers can also access orders assigned to them
        is_assigned_driver = False
        if current_user.role == UserRole.DRIVER and order.driver_id:
            driver_result = await db.execute(
                select(Driver).where(Driver.user_id == current_user.id)
            )
            driver = driver_result.scalars().first()
            if driver and order.driver_id == driver.id:
                is_assigned_driver = True

        if not has_warehouse_access and not is_assigned_driver:
            raise HTTPException(
                status_code=403, detail="You don't have access to this order"
            )

    return order


@router.post("", response_model=OrderSchema)
async def create_order(
    *,
    db: AsyncSession = Depends(deps.get_db),
    order_in: OrderCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new order.
    """
    db_obj = Order(
        sales_order_number=order_in.sales_order_number,
        customer_info=order_in.customer_info,
        total_amount=order_in.total_amount,
        payment_method=order_in.payment_method,
        warehouse_id=order_in.warehouse_id,
        status=OrderStatus.PENDING,
        notes=order_in.notes,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    # Reload with relations
    query = (
        select(Order)
        .where(Order.id == db_obj.id)
        .options(
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
            selectinload(Order.warehouse),
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.driver).selectinload(Driver.warehouse),
        )
    )
    result = await db.execute(query)
    return result.scalars().first()


@router.post("/import")
async def import_orders(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Import orders from Excel file.
    """

    def _is_empty(val: object) -> bool:
        if val is None:
            return True
        s = str(val).strip().lower()
        return s in ("", "nan", "none")

    def clean_value(val: object) -> str | None:
        if _is_empty(val):
            return None
        return str(val).strip()

    try:
        contents = await file.read()
        import io

        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        try:
            data = excel_service.parse_file(
                io.BytesIO(contents), filename=file.filename or ""
            )
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Could not parse file '{file.filename}'. "
                f"Supported formats: .xlsx, .xls, .csv, HTML tables. Error: {str(e)}",
            )

        created_count = 0
        errors = []

        # Build warehouse code -> id mapping
        wh_stmt = select(Warehouse)
        wh_result = await db.execute(wh_stmt)
        all_warehouses = wh_result.scalars().all()
        warehouse_map = {wh.code: wh.id for wh in all_warehouses}

        # Find main warehouse (WH01) as fallback for unknown codes
        main_warehouse = next((wh for wh in all_warehouses if wh.code == "WH01"), None)
        default_warehouse = main_warehouse or (
            all_warehouses[0] if all_warehouses else None
        )

        for i, row in enumerate(data):
            try:
                # Use same mapping logic as before
                # Fix: Look for "Sales order" OR "Sales Order" OR "Order Number"
                # Excel keys usually preserve case, but let's be safe
                keys = {k.strip().lower(): k for k in row.keys()}

                def get_val(key_fragment):
                    # find valid key
                    for k in keys:
                        if key_fragment.lower() in k.lower():
                            return row[keys[k]]
                    return None

                # Direct mapping based on user file confirmation
                order_num_raw = row.get("Sales order") or row.get("Order Number")

                if _is_empty(order_num_raw):
                    raise Exception("Missing 'Sales order' column or value")

                sales_order_number = str(order_num_raw).strip()

                cust_name = clean_value(
                    row.get("Customer name") or row.get("Customer Name")
                )
                cust_phone = clean_value(row.get("Customer phone") or row.get("Phone"))
                cust_addr = clean_value(
                    row.get("Customer address") or row.get("Address")
                )
                cust_area = clean_value(row.get("Area"))

                amount_raw = row.get("Total amount") or row.get("Amount")
                total_amount = float(amount_raw) if not _is_empty(amount_raw) else 0.0

                # Extract payment method - prefer "Retail payment method" from MS Dynamics
                retail_payment_raw = row.get("Retail payment method") or row.get(
                    "retail payment method"
                )
                payment_method_raw = (
                    retail_payment_raw
                    or row.get("Payment Method")
                    or row.get("Payment method")
                    or row.get("payment_method")
                    or row.get("Payment")
                    or row.get("Method")
                )
                payment_method = clean_value(payment_method_raw) or "CASH"

                # Extract sales taker
                sales_taker = clean_value(
                    row.get("Sales taker")
                    or row.get("Sales Taker")
                    or row.get("sales_taker")
                )

                # Extract customer account
                customer_account = clean_value(
                    row.get("Customer account") or row.get("Customer Account")
                )

                # Extract warehouse code from Excel and map to warehouse ID
                excel_wh_code = clean_value(
                    row.get("Warehouse") or row.get("warehouse") or row.get("WH")
                )

                if excel_wh_code and excel_wh_code in warehouse_map:
                    target_wh_id = warehouse_map[excel_wh_code]
                elif default_warehouse:
                    target_wh_id = default_warehouse.id
                else:
                    # Create default warehouse if none exists
                    new_wh = Warehouse(
                        code="WH-DEFAULT",
                        name="Main Warehouse",
                        location=WKTElement("POINT(47.9774 29.3759)", srid=4326),
                    )
                    db.add(new_wh)
                    await db.flush()
                    await db.refresh(new_wh)
                    default_warehouse = new_wh
                    warehouse_map[new_wh.code] = new_wh.id
                    target_wh_id = new_wh.id

                order_in = OrderCreate(
                    sales_order_number=sales_order_number,
                    customer_info={
                        "name": cust_name,
                        "phone": cust_phone,
                        "address": cust_addr,
                        "area": cust_area,
                        "account": customer_account,
                    },
                    total_amount=total_amount,
                    payment_method=payment_method,
                    warehouse_id=target_wh_id,
                    status=OrderStatus.PENDING,
                )

                # Check for duplicate
                res = await db.execute(
                    select(Order).where(
                        Order.sales_order_number == order_in.sales_order_number
                    )
                )
                if res.scalars().first():
                    raise Exception(
                        f"Order {order_in.sales_order_number} already exists"
                    )

                db_obj = Order(
                    sales_order_number=order_in.sales_order_number,
                    customer_info=order_in.customer_info,
                    total_amount=order_in.total_amount,
                    payment_method=order_in.payment_method,
                    warehouse_id=order_in.warehouse_id,
                    status=OrderStatus.PENDING,
                    sales_taker=sales_taker,
                )
                db.add(db_obj)
                created_count += 1
            except Exception as e:
                errors.append({"row": i + 1, "error": str(e)})

        await db.commit()
        return {"created": created_count, "errors": errors}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Import failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


# ==========================================
# STATIC POST ROUTES - Must be before /{order_id} routes
# ==========================================


@router.post("/auto-archive")
async def auto_archive_orders(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Dict[str, Any]:
    """
    Auto-archive delivered orders using 24-hour buffer.
    Orders are archived 24 hours after delivery (based on delivered_at field).
    Falls back to 7 days based on updated_at for orders without delivered_at.
    This endpoint is designed to be called by a daily cron job.
    Admin only.
    """
    from sqlalchemy import or_, and_

    now = datetime.now(timezone.utc)
    cutoff_24h = now - timedelta(hours=24)
    cutoff_7d = now - timedelta(days=7)

    # Find delivered orders that should be archived:
    # 1. Orders with delivered_at more than 24 hours ago, OR
    # 2. Legacy orders without delivered_at, using updated_at > 7 days as fallback
    stmt = (
        select(Order)
        .where(Order.status == OrderStatus.DELIVERED)
        .where(Order.is_archived.is_(False))
        .where(
            or_(
                # New logic: delivered_at is set and more than 24 hours ago
                and_(Order.delivered_at.isnot(None), Order.delivered_at < cutoff_24h),
                # Legacy fallback: no delivered_at, use updated_at > 7 days
                and_(Order.delivered_at.is_(None), Order.updated_at < cutoff_7d),
            )
        )
    )
    result = await db.execute(stmt)
    orders_to_archive = result.scalars().all()

    archived_count = 0
    for order in orders_to_archive:
        order.is_archived = True
        db.add(order)
        archived_count += 1

    await db.commit()
    return {"msg": f"Archived {archived_count} orders"}


# ==========================================
# BATCH OPERATIONS
# ==========================================


class BatchCancelRequest(BaseModel):
    order_ids: List[int]
    reason: Optional[str] = None


class BatchDeleteRequest(BaseModel):
    order_ids: List[int]


@router.post("/batch-cancel")
async def batch_cancel_orders(
    request: BatchCancelRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Batch cancel multiple orders.
    Cannot cancel orders that are already DELIVERED.
    """
    cancelled_count = 0
    errors = []

    # Verify warehouse access for all orders upfront
    warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)

    # Bulk fetch all orders in a single query
    result = await db.execute(select(Order).where(Order.id.in_(request.order_ids)))
    orders_map = {order.id: order for order in result.scalars().all()}

    for order_id in request.order_ids:
        order = orders_map.get(order_id)
        if not order:
            errors.append({"order_id": order_id, "error": "Order not found"})
            continue

        if warehouse_ids is not None and order.warehouse_id not in warehouse_ids:
            errors.append(
                {"order_id": order_id, "error": "No access to this warehouse"}
            )
            continue

        if order.status == OrderStatus.DELIVERED:
            errors.append(
                {"order_id": order_id, "error": "Cannot cancel a delivered order"}
            )
            continue

        if order.status == OrderStatus.CANCELLED:
            errors.append({"order_id": order_id, "error": "Order is already cancelled"})
            continue

        notes = (
            f"Batch cancelled: {request.reason}"
            if request.reason
            else "Batch cancelled"
        )
        history = order_status_service.apply_status(order, OrderStatus.CANCELLED, notes)
        db.add(history)
        db.add(order)
        cancelled_count += 1

    await db.commit()
    return {"cancelled": cancelled_count, "errors": errors}


@router.post("/batch-delete")
async def batch_delete_orders(
    request: BatchDeleteRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Dict[str, Any]:
    """
    Batch delete multiple orders (hard deletion).
    Admin only - removes orders and all related data.
    Uses optimized bulk delete for performance.
    """
    if not request.order_ids:
        return {"deleted": 0, "errors": []}

    # First, find which order IDs actually exist
    existing_result = await db.execute(
        select(Order.id).where(Order.id.in_(request.order_ids))
    )
    existing_ids = set(row[0] for row in existing_result.fetchall())

    # Track orders not found
    errors = [
        {"order_id": oid, "error": "Order not found"}
        for oid in request.order_ids
        if oid not in existing_ids
    ]

    if existing_ids:
        # Delete related records first (cascade may not handle all)
        # Delete proof of delivery
        await db.execute(
            delete(ProofOfDelivery).where(ProofOfDelivery.order_id.in_(existing_ids))
        )
        # Delete order status history
        await db.execute(
            delete(OrderStatusHistory).where(
                OrderStatusHistory.order_id.in_(existing_ids)
            )
        )
        # Delete payment collections
        await db.execute(
            delete(PaymentCollection).where(
                PaymentCollection.order_id.in_(existing_ids)
            )
        )
        # Finally delete the orders themselves
        await db.execute(delete(Order).where(Order.id.in_(existing_ids)))

    await db.commit()
    return {"deleted": len(existing_ids), "errors": errors}


class BatchPickupRequest(BaseModel):
    order_ids: List[int]


@router.post("/batch-pickup")
async def batch_pickup_orders(
    request: BatchPickupRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Batch pickup multiple orders.
    Only the assigned driver can pickup their assigned orders.
    Orders must be in ASSIGNED status to be picked up.
    """
    from app.models.user import UserRole

    # Verify user is a driver
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can pickup orders")

    # Get driver profile
    driver_result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = driver_result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    picked_up_count = 0
    errors: List[Dict[str, Any]] = []

    # Bulk fetch all orders to avoid N+1 queries
    result = await db.execute(select(Order).where(Order.id.in_(request.order_ids)))
    orders_map: Dict[int, Order] = {order.id: order for order in result.scalars().all()}

    for order_id in request.order_ids:
        order = orders_map.get(order_id)
        if not order:
            errors.append({"order_id": order_id, "error": "Order not found"})
            continue

        if order.driver_id != driver.id:
            errors.append(
                {"order_id": order_id, "error": "Order is not assigned to you"}
            )
            continue

        if order.status != OrderStatus.ASSIGNED:
            errors.append(
                {
                    "order_id": order_id,
                    "error": f"Order must be in ASSIGNED status, currently: {order.status}",
                }
            )
            continue

        # Update order status to PICKED_UP
        history = order_status_service.apply_status(
            order, OrderStatus.PICKED_UP, "Batch picked up by driver"
        )
        db.add(history)
        db.add(order)
        picked_up_count += 1

    await db.commit()
    return {"picked_up": picked_up_count, "errors": errors}


class BatchDeliveryRequest(BaseModel):
    order_ids: List[int]
    proofs: Optional[List[Dict[str, Any]]] = (
        None  # [{order_id, photo_url?, signature_url?}]
    )


@router.post("/batch-delivery")
async def batch_delivery_orders(
    request: BatchDeliveryRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Complete multiple deliveries at once.
    POD (Proof of Delivery) is optional.
    Orders must be in PICKED_UP, IN_TRANSIT, or OUT_FOR_DELIVERY status.
    Only the assigned driver can complete delivery.
    """
    from app.models.user import UserRole

    # Verify user is a driver
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can deliver orders")

    # Get driver profile
    driver_result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = driver_result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    # Build proof lookup if provided
    proof_lookup = {}
    if request.proofs:
        for proof in request.proofs:
            if "order_id" in proof:
                proof_lookup[proof["order_id"]] = proof

    delivered_count = 0
    errors: List[Dict[str, Any]] = []
    valid_statuses = [
        OrderStatus.PICKED_UP,
        OrderStatus.IN_TRANSIT,
        OrderStatus.OUT_FOR_DELIVERY,
    ]

    # Bulk fetch all orders with POD to avoid N+1 queries
    result = await db.execute(
        select(Order)
        .where(Order.id.in_(request.order_ids))
        .options(selectinload(Order.proof_of_delivery))
    )
    orders_map: Dict[int, Order] = {order.id: order for order in result.scalars().all()}

    for order_id in request.order_ids:
        order = orders_map.get(order_id)

        if not order:
            errors.append({"order_id": order_id, "error": "Order not found"})
            continue

        if order.driver_id != driver.id:
            errors.append(
                {"order_id": order_id, "error": "Order is not assigned to you"}
            )
            continue

        if order.status not in valid_statuses:
            errors.append(
                {
                    "order_id": order_id,
                    "error": f"Order must be in PICKED_UP, IN_TRANSIT, or OUT_FOR_DELIVERY status, currently: {order.status}",
                }
            )
            continue

        # Update order status to DELIVERED
        # Don't set is_archived immediately - will be done by 24h buffer logic
        history = order_status_service.apply_status(
            order, OrderStatus.DELIVERED, "Batch delivered by driver"
        )
        db.add(history)

        # Handle POD if provided
        proof_data = proof_lookup.get(order_id)
        if proof_data:
            photo_url = proof_data.get("photo_url")
            signature_url = proof_data.get("signature_url")

            if order.proof_of_delivery:
                # Update existing POD
                if photo_url:
                    order.proof_of_delivery.photo_url = photo_url
                if signature_url:
                    order.proof_of_delivery.signature_url = signature_url
                order.proof_of_delivery.timestamp = datetime.now(timezone.utc)
            else:
                # Create new POD
                if photo_url or signature_url:
                    pod = ProofOfDelivery(
                        order_id=order.id,
                        photo_url=photo_url,
                        signature_url=signature_url,
                    )
                    db.add(pod)

        db.add(order)
        delivered_count += 1

    await db.commit()
    return {"delivered": delivered_count, "errors": errors}


@router.post("/batch-assign")
async def batch_assign_orders(
    assignments: List[Dict[str, int]] = Body(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Batch assign orders.
    """
    warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)

    result = await assignment_service.batch_assign_orders(
        db=db,
        assignments=assignments,
        assigned_by=current_user,
        user_warehouse_ids=warehouse_ids,
    )
    await db.commit()
    return result


class BatchReturnRequest(BaseModel):
    order_ids: List[int]
    reason: str


@router.post("/batch-return")
async def batch_return_orders(
    request: BatchReturnRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Batch return multiple delivered orders.
    Only DELIVERED orders can be returned.
    """
    returned_count = 0
    errors: List[Dict[str, Any]] = []

    warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)

    # Bulk fetch all orders with driver info to avoid N+1 queries
    result = await db.execute(
        select(Order)
        .where(Order.id.in_(request.order_ids))
        .options(selectinload(Order.driver).selectinload(Driver.user))
    )
    orders_map: Dict[int, Order] = {order.id: order for order in result.scalars().all()}

    for order_id in request.order_ids:
        order = orders_map.get(order_id)
        if not order:
            errors.append({"order_id": order_id, "error": "Order not found"})
            continue

        if warehouse_ids is not None and order.warehouse_id not in warehouse_ids:
            errors.append(
                {"order_id": order_id, "error": "No access to this warehouse"}
            )
            continue

        if order.status != OrderStatus.DELIVERED:
            errors.append(
                {
                    "order_id": order_id,
                    "error": f"Only delivered orders can be returned, currently: {order.status}",
                }
            )
            continue

        history = order_status_service.apply_status(
            order, OrderStatus.RETURNED, f"Return reason: {request.reason}"
        )
        db.add(history)
        db.add(order)
        returned_count += 1

        # Notify assigned driver
        if order.driver and order.driver.user and order.driver.user.fcm_token:
            try:
                from app.models.notification import Notification

                notif = Notification(
                    user_id=order.driver.user_id,
                    title="Order Returned",
                    body=f"Order {order.sales_order_number or order.id} has been returned: {request.reason}",
                    data={"type": "order", "order_id": str(order.id)},
                    created_at=datetime.now(timezone.utc),
                )
                db.add(notif)
            except Exception as e:
                logger.error(f"Error notifying driver about return: {e}")

    await db.commit()
    return {"returned": returned_count, "errors": errors}


class BatchCancelStaleRequest(BaseModel):
    days_threshold: int = 7


@router.post("/batch-cancel-stale")
async def batch_cancel_stale_orders(
    request: BatchCancelStaleRequest = BatchCancelStaleRequest(),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_manager_or_above),
) -> Dict[str, Any]:
    """
    Cancel all stale pending orders older than the specified threshold.
    Only cancels orders with status 'pending' (not assigned, which have a driver working them).
    Manager or above access required.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=request.days_threshold)

    warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)

    stmt = (
        select(Order)
        .where(
            Order.status == OrderStatus.PENDING,
            Order.is_archived.is_(False),
            Order.created_at < cutoff,
        )
    )
    if warehouse_ids is not None:
        stmt = stmt.where(Order.warehouse_id.in_(warehouse_ids))

    result = await db.execute(stmt)
    stale_orders = result.scalars().all()

    cancelled_count = 0
    for order in stale_orders:
        order.status = OrderStatus.CANCELLED
        order.notes = (order.notes + " | " if order.notes else "") + \
            f"Bulk cancelled: stale order ({request.days_threshold}+ days pending)"
        db.add(order)

        history = OrderStatusHistory(
            order_id=order.id,
            status=OrderStatus.CANCELLED,
            notes=f"Bulk cancelled by {current_user.email}: stale order ({request.days_threshold}+ days pending)",
            timestamp=now,
        )
        db.add(history)
        cancelled_count += 1

    await db.commit()

    logger.info(
        f"Batch cancel stale: {cancelled_count} orders cancelled by {current_user.email}"
    )
    return {
        "cancelled": cancelled_count,
        "days_threshold": request.days_threshold,
        "message": f"Cancelled {cancelled_count} stale pending orders older than {request.days_threshold} days",
    }


# ==========================================
# ORDER-SPECIFIC ROUTES (with /{order_id})
# ==========================================


@router.post("/{order_id}/assign", response_model=OrderSchema)
async def assign_order(
    order_id: int,
    driver_id: int = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Assign order to driver.
    """
    # Load order with existing driver to detect reassignment
    order_result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.driver).selectinload(Driver.warehouse),
        )
    )
    order = order_result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await deps.verify_order_warehouse_access(order.warehouse_id, current_user, db)

    try:
        await assignment_service.assign_order(
            db=db,
            order=order,
            driver_id=driver_id,
            assigned_by=current_user,
        )
        await db.commit()
    except DriverNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except DriverNotAvailableException as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Re-fetch with eager loading for response
    # populate_existing=True forces SQLAlchemy to refresh from DB even if object is cached
    # This is needed because expire_on_commit=False keeps the old driver in identity map
    query = (
        select(Order)
        .where(Order.id == order.id)
        .options(
            selectinload(Order.warehouse),
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.driver).selectinload(Driver.warehouse),
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
        )
        .execution_options(populate_existing=True)
    )
    result = await db.execute(query)
    return OrderSchema.model_validate(result.scalars().first())


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: OrderStatus = Body(..., embed=True),
    notes: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update order status.
    Drivers can update orders assigned to them.
    Other roles require warehouse access.
    """
    from app.models.user import UserRole

    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # For drivers, check if they're assigned to this order
    if current_user.role == UserRole.DRIVER:
        driver_result = await db.execute(
            select(Driver).where(Driver.user_id == current_user.id)
        )
        driver = driver_result.scalars().first()
        if not driver or order.driver_id != driver.id:
            raise HTTPException(
                status_code=403, detail="Order is not assigned to you"
            )
    else:
        # For other roles, check warehouse access
        await deps.verify_order_warehouse_access(order.warehouse_id, current_user, db)

    history = order_status_service.apply_status(order, status, notes)
    db.add(history)
    db.add(order)
    await db.commit()
    await db.refresh(order)

    query = (
        select(Order)
        .where(Order.id == order.id)
        .options(
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.driver).selectinload(Driver.warehouse),
            selectinload(Order.warehouse),
        )
    )
    result = await db.execute(query)
    order_obj = result.scalars().first()

    # Return Pydantic model to avoid lazy loading issues with raw SQLAlchemy object
    return OrderSchema.model_validate(order_obj)


@router.post("/{order_id}/proof-of-delivery")
async def upload_proof_of_delivery(
    order_id: int,
    photo: UploadFile = File(...),
    signature: Optional[str] = Body(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload proof of delivery (photo and optional signature).
    Saved to Supabase Storage.
    """
    # Check order exists and user has access
    query = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.proof_of_delivery),
        )
    )
    result = await db.execute(query)
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Upload photo to Supabase via POD service
    photo_contents = await photo.read()
    photo_url = await pod_service.upload_photo(
        order_id=order_id,
        photo_content=photo_contents,
        content_type=photo.content_type or "image/jpeg",
    )

    if not photo_url:
        raise HTTPException(status_code=500, detail="Failed to upload photo to storage")

    # Complete delivery with POD
    await pod_service.complete_delivery(
        db=db,
        order=order,
        photo_url=photo_url,
        signature_url=signature,
        notes="Proof of delivery uploaded via mobile app",
    )

    await db.commit()

    # Re-fetch order for notification
    query = (
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.driver).selectinload(Driver.user))
    )
    result = await db.execute(query)
    order = result.scalars().first()

    # Trigger post-delivery notifications (wrapped in try-except)
    try:
        await pod_service.process_post_delivery(db, order)
    except Exception as e:
        logger.error(f"Error in POD notifications: {e}")
        # Continue - POD was submitted successfully, don't fail on notification errors

    await db.commit()
    return {"msg": "Proof of delivery uploaded successfully", "photo_url": photo_url}


class PODUrlRequest(BaseModel):
    photo_url: str
    signature_url: Optional[str] = None


@router.post("/{order_id}/proof-of-delivery-url")
async def submit_proof_of_delivery_url(
    order_id: int,
    pod_data: PODUrlRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Submit proof of delivery using pre-uploaded URLs (for mobile app).
    Mobile app uploads photo via /upload first, then submits URL here.
    """
    # Check order exists and user has access
    query = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.proof_of_delivery),
        )
    )
    result = await db.execute(query)
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Complete delivery with POD using pre-uploaded URLs
    await pod_service.complete_delivery(
        db=db,
        order=order,
        photo_url=pod_data.photo_url,
        signature_url=pod_data.signature_url,
        notes="Proof of delivery submitted via mobile app",
    )

    await db.commit()

    # Process post-delivery actions (notifications, payment collection)
    try:
        await pod_service.process_post_delivery(db, order)
        await db.commit()
    except Exception as e:
        logger.error(f"Error in POD post-delivery processing: {e}")
    return {
        "msg": "Proof of delivery submitted successfully",
        "photo_url": pod_data.photo_url,
    }


@router.post("/export")
async def export_orders(
    status: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    search: Optional[str] = None,
    driver_id: Optional[int] = None,
    customer_name: Optional[str] = None,
    customer_phone: Optional[str] = None,
    customer_address: Optional[str] = None,
    order_number: Optional[str] = None,
    driver_name: Optional[str] = None,
    driver_code: Optional[str] = None,
    sales_taker: Optional[str] = None,
    payment_method: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    date_field: Optional[str] = "created_at",
    include_archived: bool = False,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Export filtered orders with all columns.
    Accepts the same filter parameters as read_orders.
    """
    query = select(Order).options(
        selectinload(Order.warehouse),
        selectinload(Order.driver).selectinload(Driver.user),
    )

    filters = []

    # Warehouse access control
    user_warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)
    if user_warehouse_ids is not None:
        filters.append(Order.warehouse_id.in_(user_warehouse_ids))

    # Archive filter
    filters.append(Order.is_archived.is_(include_archived))

    if status:
        filters.append(Order.status == status)
    if warehouse_id:
        filters.append(Order.warehouse_id == warehouse_id)
    if driver_id:
        filters.append(Order.driver_id == driver_id)

    # Field-specific filters
    if customer_name:
        filters.append(
            cast(Order.customer_info["name"], String).ilike(f"%{customer_name}%")
        )
    if customer_phone:
        filters.append(
            cast(Order.customer_info["phone"], String).ilike(f"%{customer_phone}%")
        )
    if customer_address:
        filters.append(
            cast(Order.customer_info["address"], String).ilike(f"%{customer_address}%")
        )
    if order_number:
        filters.append(Order.sales_order_number.ilike(f"%{order_number}%"))
    if driver_name:
        dn_subq = (
            select(Driver.id)
            .join(User, Driver.user_id == User.id)
            .where(
                Driver.id == Order.driver_id, User.full_name.ilike(f"%{driver_name}%")
            )
        )
        filters.append(exists(dn_subq))
    if driver_code:
        dc_subq = select(Driver.id).where(
            Driver.id == Order.driver_id, Driver.code.ilike(f"%{driver_code}%")
        )
        filters.append(exists(dc_subq))
    if sales_taker:
        filters.append(Order.sales_taker.ilike(f"%{sales_taker}%"))
    if payment_method:
        filters.append(Order.payment_method.ilike(f"%{payment_method}%"))

    # Universal search
    if search:
        search_filter = f"%{search}%"
        search_conditions = [
            Order.sales_order_number.ilike(search_filter),
            cast(Order.customer_info["name"], String).ilike(search_filter),
            cast(Order.customer_info["phone"], String).ilike(search_filter),
            Order.status.ilike(search_filter),
            Order.notes.ilike(search_filter),
        ]
        filters.append(or_(*search_conditions))

    # Date range
    if date_from or date_to:
        DATE_FIELDS = {
            "created_at": Order.created_at,
            "assigned_at": Order.assigned_at,
            "picked_up_at": Order.picked_up_at,
            "delivered_at": Order.delivered_at,
        }
        date_col = DATE_FIELDS.get(date_field, Order.created_at)
        if date_from:
            try:
                filters.append(date_col >= datetime.fromisoformat(date_from))
            except ValueError:
                pass
        if date_to:
            try:
                to_dt = datetime.fromisoformat(date_to).replace(
                    hour=23, minute=59, second=59
                )
                filters.append(date_col <= to_dt)
            except ValueError:
                pass

    if filters:
        query = query.where(*filters)

    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    orders = result.scalars().all()

    data = []
    for o in orders:
        # Compute delivery time
        delivery_time = ""
        if o.picked_up_at and o.delivered_at:
            diff = o.delivered_at - o.picked_up_at
            total_seconds = int(diff.total_seconds())
            if total_seconds >= 0:
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                delivery_time = f"{hours:02d}:{minutes:02d}"

        data.append(
            {
                "Order #": o.sales_order_number,
                "Status": o.status,
                "Customer Name": (
                    o.customer_info.get("name", "") if o.customer_info else ""
                ),
                "Customer Phone": (
                    o.customer_info.get("phone", "") if o.customer_info else ""
                ),
                "Customer Address": (
                    o.customer_info.get("address", "") if o.customer_info else ""
                ),
                "Customer Area": (
                    o.customer_info.get("area", "") if o.customer_info else ""
                ),
                "Amount": o.total_amount,
                "Payment Method": o.payment_method,
                "Warehouse": o.warehouse.code if o.warehouse else "",
                "Driver Name": (
                    o.driver.user.full_name if o.driver and o.driver.user else ""
                ),
                "Driver Phone": (
                    o.driver.user.phone if o.driver and o.driver.user else ""
                ),
                "Driver Code": o.driver.code if o.driver else "",
                "Sales Taker": o.sales_taker or "",
                "Created": (
                    o.created_at.strftime("%Y-%m-%d %H:%M") if o.created_at else ""
                ),
                "Assigned": (
                    o.assigned_at.strftime("%Y-%m-%d %H:%M") if o.assigned_at else ""
                ),
                "Picked Up": (
                    o.picked_up_at.strftime("%Y-%m-%d %H:%M") if o.picked_up_at else ""
                ),
                "Delivered": (
                    o.delivered_at.strftime("%Y-%m-%d %H:%M") if o.delivered_at else ""
                ),
                "Delivery Time": delivery_time,
                "Notes": o.notes or "",
            }
        )

    stream = excel_service.write_xlsx(data, sheet_name="Orders")

    headers = {"Content-Disposition": 'attachment; filename="orders.xlsx"'}
    return StreamingResponse(
        stream,
        headers=headers,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.post("/{order_id}/reassign")
async def reassign_order(
    order_id: int,
    driver_id: int = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    return await assign_order(order_id, driver_id, db, current_user)


@router.post("/{order_id}/unassign")
async def unassign_order_endpoint(
    order_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Unassign an order from its driver.
    """
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await deps.verify_order_warehouse_access(order.warehouse_id, current_user, db)

    await assignment_service.unassign_order(db, order)
    await db.commit()
    return {"msg": "Order unassigned"}


@router.post("/{order_id}/reject")
async def reject_order(
    order_id: int,
    reason: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    history = order_status_service.apply_status(
        order, OrderStatus.REJECTED, f"Rejected: {reason}"
    )
    db.add(history)
    db.add(order)
    await db.commit()
    return {"msg": "Order rejected"}


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    reason: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Cancel an order (soft cancellation - changes status to CANCELLED).
    """
    # Load order with driver relationship for notification
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.driver).selectinload(Driver.user))
    )
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await deps.verify_order_warehouse_access(order.warehouse_id, current_user, db)

    if order.status == OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Cannot cancel a delivered order")

    # Store driver info before cancellation
    previous_driver = order.driver
    previous_driver_user = previous_driver.user if previous_driver else None

    notes = f"Cancelled: {reason}" if reason else "Order cancelled"
    history = order_status_service.apply_status(order, OrderStatus.CANCELLED, notes)
    db.add(history)
    db.add(order)

    # Notify the driver if the order was assigned
    if previous_driver_user:
        await notification_service.notify_driver_order_cancelled(
            db=db,
            user_id=previous_driver_user.id,
            order_id=order.id,
            order_number=order.sales_order_number,
            token=previous_driver_user.fcm_token,
        )

    await db.commit()
    return {"msg": "Order cancelled successfully"}


@router.post("/{order_id}/return")
async def return_order(
    order_id: int,
    reason: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Return a delivered order.
    Only DELIVERED orders can be returned. Requires a reason.
    """
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.driver).selectinload(Driver.user))
    )
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await deps.verify_order_warehouse_access(order.warehouse_id, current_user, db)

    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(
            status_code=400,
            detail=f"Only delivered orders can be returned. Current status: {order.status}",
        )

    history = order_status_service.apply_status(
        order, OrderStatus.RETURNED, f"Return reason: {reason}"
    )
    db.add(history)
    db.add(order)

    # Notify assigned driver
    if order.driver and order.driver.user and order.driver.user.fcm_token:
        try:
            from app.models.notification import Notification

            notif = Notification(
                user_id=order.driver.user_id,
                title="Order Returned",
                body=f"Order {order.sales_order_number or order.id} has been returned: {reason}",
                data={"type": "order", "order_id": str(order.id)},
                created_at=datetime.now(timezone.utc),
            )
            db.add(notif)
        except Exception as e:
            logger.error(f"Error notifying driver about return: {e}")

    await db.commit()
    return {"msg": "Order returned successfully"}


@router.patch("/{order_id}/payment-method")
async def update_payment_method(
    order_id: int,
    payment_method: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update the payment method for an order.
    Allowed for active and delivered orders. Blocked for cancelled/rejected/returned.
    Drivers can only update orders assigned to them.
    """
    valid_methods = {"CASH", "COD", "KNET", "LINK", "CREDIT_CARD"}
    if payment_method.upper() not in valid_methods:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment method. Must be one of: {', '.join(sorted(valid_methods))}",
        )

    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.driver))
    )
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Block terminal statuses (except delivered)
    terminal = {OrderStatus.CANCELLED, OrderStatus.REJECTED, OrderStatus.RETURNED}
    if order.status in terminal:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change payment method for {order.status} orders",
        )

    # Drivers can only update their own assigned orders
    if current_user.role == "driver":
        driver_result = await db.execute(
            select(Driver).where(Driver.user_id == current_user.id)
        )
        driver = driver_result.scalars().first()
        if not driver or order.driver_id != driver.id:
            raise HTTPException(
                status_code=403,
                detail="You can only update payment method for orders assigned to you",
            )
    else:
        # Admins/managers: warehouse access check
        await deps.verify_order_warehouse_access(order.warehouse_id, current_user, db)

    order.payment_method = payment_method.upper()
    db.add(order)
    await db.commit()
    return {"msg": "Payment method updated", "payment_method": order.payment_method}


@router.delete("/{order_id}")
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Permanently delete an order (hard deletion).
    Admin only - removes order and all related data (history, POD).
    """

    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Delete related records first (cascade handles this but being explicit)
    await db.delete(order)
    await db.commit()

    return {"msg": f"Order {order_id} permanently deleted"}


@router.post("/{order_id}/archive")
async def archive_order(
    order_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Archive an order (hide from default view).
    """
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await deps.verify_order_warehouse_access(order.warehouse_id, current_user, db)

    order.is_archived = True
    db.add(order)
    await db.commit()
    return {"msg": f"Order {order_id} archived"}


@router.post("/{order_id}/unarchive")
async def unarchive_order(
    order_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Unarchive an order (restore to active view).
    """
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await deps.verify_order_warehouse_access(order.warehouse_id, current_user, db)

    order.is_archived = False
    db.add(order)
    await db.commit()
    return {"msg": f"Order {order_id} restored from archive"}
