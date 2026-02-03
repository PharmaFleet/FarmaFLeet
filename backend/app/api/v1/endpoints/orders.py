from datetime import datetime, timedelta
import uuid
from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete
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
import pandas as pd

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
                detail="You don't have access to orders from this warehouse"
            )
    if driver_id:
        filters.append(Order.driver_id == driver_id)
    if search:
        from sqlalchemy import or_, cast, String

        search_filter = f"%{search}%"
        filters.append(
            or_(
                Order.sales_order_number.ilike(search_filter),
                cast(Order.customer_info["name"], String).ilike(search_filter),
                cast(Order.customer_info["phone"], String).ilike(search_filter),
            )
        )

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination logic
    skip = (page - 1) * limit
    pages = ceil(total / limit) if limit > 0 else 1

    # Get items
    query = (
        query.options(
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
            selectinload(Order.warehouse),
            selectinload(Order.driver).selectinload(Driver.user),
            selectinload(Order.driver).selectinload(Driver.warehouse),
        )
        .order_by(desc(Order.created_at))
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
                status_code=403,
                detail="You don't have access to this order"
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
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    # Reload with relations
    query = (
        select(Order)
        .where(Order.id == db_obj.id)
        .options(
            selectinload(Order.status_history), selectinload(Order.proof_of_delivery)
        )
    )
    result = await db.execute(query)
    return result.scalars().first()


@router.post("/import")
async def import_orders(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Import orders from Excel file.
    """

    def clean_value(val):
        if pd.isna(val) or str(val).strip() == "" or str(val).lower() == "nan":
            return None
        return str(val).strip()

    try:
        contents = await file.read()
        import io

        try:
            data = excel_service.parse_file(io.BytesIO(contents))
        except Exception as e:
            raise Exception(f"Excel Parse Error: {str(e)}")

        created_count = 0
        errors = []

        # Build warehouse code -> id mapping
        wh_stmt = select(Warehouse)
        wh_result = await db.execute(wh_stmt)
        all_warehouses = wh_result.scalars().all()
        warehouse_map = {wh.code: wh.id for wh in all_warehouses}

        # Find main warehouse (WH01) as fallback for unknown codes
        main_warehouse = next((wh for wh in all_warehouses if wh.code == "WH01"), None)
        default_warehouse = main_warehouse or (all_warehouses[0] if all_warehouses else None)

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

                if pd.isna(order_num_raw) or str(order_num_raw).strip() == "":
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
                total_amount = float(amount_raw) if not pd.isna(amount_raw) else 0.0

                # Extract payment method from Excel - support various column names
                payment_method_raw = (
                    row.get("Payment Method")
                    or row.get("Payment method")
                    or row.get("payment_method")
                    or row.get("Payment")
                    or row.get("Method")
                )
                # Clean and normalize payment method, default to CASH if empty
                payment_method = clean_value(payment_method_raw) or "CASH"

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
                    await db.commit()
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
                )
                db.add(db_obj)
                created_count += 1
            except Exception as e:
                errors.append({"row": i + 1, "error": str(e)})

        await db.commit()
        return {"created": created_count, "errors": errors}

    except Exception as e:
        import traceback
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Import failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


# ==========================================
# BATCH OPERATIONS - Must be before /{order_id} routes
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
) -> Any:
    """
    Batch cancel multiple orders.
    Cannot cancel orders that are already DELIVERED.
    """
    cancelled_count = 0
    errors = []

    for order_id in request.order_ids:
        order = await db.get(Order, order_id)
        if not order:
            errors.append({"order_id": order_id, "error": "Order not found"})
            continue

        if order.status == OrderStatus.DELIVERED:
            errors.append({"order_id": order_id, "error": "Cannot cancel a delivered order"})
            continue

        if order.status == OrderStatus.CANCELLED:
            errors.append({"order_id": order_id, "error": "Order is already cancelled"})
            continue

        order.status = OrderStatus.CANCELLED
        history = OrderStatusHistory(
            order_id=order.id,
            status=OrderStatus.CANCELLED,
            notes=f"Batch cancelled: {request.reason}" if request.reason else "Batch cancelled",
        )
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
) -> Any:
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
            delete(OrderStatusHistory).where(OrderStatusHistory.order_id.in_(existing_ids))
        )
        # Delete payment collections
        await db.execute(
            delete(PaymentCollection).where(PaymentCollection.order_id.in_(existing_ids))
        )
        # Finally delete the orders themselves
        await db.execute(
            delete(Order).where(Order.id.in_(existing_ids))
        )

    await db.commit()
    return {"deleted": len(existing_ids), "errors": errors}


@router.post("/batch-assign")
async def batch_assign_orders(
    assignments: List[Dict[str, int]] = Body(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Batch assign orders.
    """
    count = 0
    driver_notifications = {}  # driver_id -> {token: str, count: int}

    for assign in assignments:
        order_id = assign.get("order_id")
        driver_id = assign.get("driver_id")
        if not order_id or not driver_id:
            continue

        order = await db.get(Order, order_id)
        # Load driver with user for token
        drv_stmt = (
            select(Driver)
            .where(Driver.id == driver_id)
            .options(selectinload(Driver.user))
        )
        drv_res = await db.execute(drv_stmt)
        driver = drv_res.scalars().first()

        if order and driver:
            order.driver_id = driver.id
            order.status = OrderStatus.ASSIGNED
            history = OrderStatusHistory(
                order_id=order.id,
                status=OrderStatus.ASSIGNED,
                notes=f"Batch assigned to driver {driver.user_id}",
            )
            db.add(history)
            db.add(order)
            count += 1

            # Store for notification
            if driver.user.fcm_token:
                if driver_id not in driver_notifications:
                    driver_notifications[driver_id] = {
                        "token": driver.user.fcm_token,
                        "user_id": driver.user_id,
                        "count": 0,
                    }
                driver_notifications[driver_id]["count"] += 1

    await db.commit()

    # Send notifications to drivers
    for drv_id, data in driver_notifications.items():
        if data["count"] > 0:
            await notification_service.notify_driver_new_orders(
                db, data["user_id"], data["count"], data["token"]
            )

    # Notify admin users about batch assignment
    if count > 0:
        from app.models.user import User as UserModel, UserRole
        from app.models.notification import Notification
        from datetime import datetime

        admin_roles = [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.DISPATCHER]
        stmt = select(UserModel).where(UserModel.role.in_(admin_roles), UserModel.is_active.is_(True))
        result = await db.execute(stmt)
        admin_users = result.scalars().all()

        title = "Batch Assignment"
        body = f"{count} orders assigned by {current_user.full_name or current_user.email}"

        for user in admin_users:
            notif = Notification(
                user_id=user.id,
                title=title,
                body=body,
                data={"type": "order", "count": str(count)},
                created_at=datetime.utcnow(),
            )
            db.add(notif)
        await db.commit()

    return {"assigned": count}


# ==========================================
# ORDER-SPECIFIC ROUTES (with /{order_id})
# ==========================================


@router.post("/{order_id}/assign")
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
        .options(selectinload(Order.driver).selectinload(Driver.user))
    )
    order = order_result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Store previous driver for reassignment notification
    previous_driver = order.driver
    previous_driver_user = previous_driver.user if previous_driver else None
    is_reassignment = previous_driver is not None and previous_driver.id != driver_id

    stmt = (
        select(Driver).where(Driver.id == driver_id).options(selectinload(Driver.user))
    )
    result = await db.execute(stmt)
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    order.driver_id = driver.id
    order.status = OrderStatus.ASSIGNED

    history = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.ASSIGNED,
        notes=f"Assigned to driver {driver.user_id}" + (" (reassigned)" if is_reassignment else ""),
    )
    db.add(history)
    db.add(order)
    await db.commit()
    await db.refresh(order)

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
    )
    result = await db.execute(query)

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

    # Notify admin users about the assignment
    await notification_service.notify_admins_order_assigned(
        db=db,
        order_id=order.id,
        order_number=order.sales_order_number or f"#{order.id}",
        driver_name=driver.user.full_name or driver.user.email,
        assigned_by_name=current_user.full_name or current_user.email,
    )
    await db.commit()  # Commit the admin notifications

    return result.scalars().first()


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: OrderStatus = Body(..., embed=True),
    notes: Optional[str] = Body(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update order status.
    """
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status
    # Auto-archive when delivered
    if status == OrderStatus.DELIVERED:
        order.is_archived = True

    history = OrderStatusHistory(order_id=order.id, status=status, notes=notes)
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
    from app.services.storage import storage_service

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

    # Upload Photo to Supabase
    photo_contents = await photo.read()
    photo_filename = f"orders/{order_id}/photo_{uuid.uuid4()}.jpg"
    photo_url = await storage_service.upload_file(
        file_content=photo_contents,
        file_name=photo_filename,
        content_type=photo.content_type or "image/jpeg",
    )

    if not photo_url:
        raise HTTPException(status_code=500, detail="Failed to upload photo to storage")

    if order.proof_of_delivery:
        order.proof_of_delivery.signature_url = signature
        order.proof_of_delivery.photo_url = photo_url
        order.proof_of_delivery.timestamp = datetime.utcnow()
    else:
        pod = ProofOfDelivery(
            order_id=order.id,
            signature_url=signature,
            photo_url=photo_url,
        )
        db.add(pod)

    order.status = OrderStatus.DELIVERED
    order.is_archived = True  # Auto-archive on delivery
    history = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.DELIVERED,
        notes="Proof of delivery uploaded via mobile app",
    )
    db.add(history)

    await db.commit()

    # Re-fetch order for notification
    query = (
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.driver).selectinload(Driver.user))
    )
    result = await db.execute(query)
    order = result.scalars().first()

    # Trigger notifications (wrapped in try-except to not fail the whole request)
    try:
        if order and order.driver and order.driver.user and order.driver.user.fcm_token:
            await notification_service.notify_driver_order_delivered(
                db, order.driver.user_id, order.id, order.driver.user.fcm_token
            )

            # Payment collection - check if payment already exists
            if (
                order.payment_method
                and order.payment_method.upper() in ["CASH", "COD"]
                and order.total_amount > 0
            ):
                # Check if payment already exists
                existing_payment = await db.execute(
                    select(PaymentCollection).where(PaymentCollection.order_id == order.id)
                )
                if not existing_payment.scalars().first():
                    from app.models.financial import PaymentMethod
                    method_enum = PaymentMethod(order.payment_method.upper())
                    payment = PaymentCollection(
                        order_id=order.id,
                        driver_id=order.driver_id,
                        amount=order.total_amount,
                        method=method_enum,
                        collected_at=datetime.utcnow(),
                    )
                    db.add(payment)

                    await notification_service.notify_driver_payment_collected(
                        db,
                        order.driver.user_id,
                        order.id,
                        order.total_amount,
                        order.driver.user.fcm_token,
                    )
    except Exception as e:
        print(f"Error in POD notifications: {e}")
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

    if order.proof_of_delivery:
        order.proof_of_delivery.signature_url = pod_data.signature_url
        order.proof_of_delivery.photo_url = pod_data.photo_url
        order.proof_of_delivery.timestamp = datetime.utcnow()
    else:
        pod = ProofOfDelivery(
            order_id=order.id,
            signature_url=pod_data.signature_url,
            photo_url=pod_data.photo_url,
        )
        db.add(pod)

    order.status = OrderStatus.DELIVERED
    order.is_archived = True  # Auto-archive on delivery
    history = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.DELIVERED,
        notes="Proof of delivery submitted via mobile app",
    )
    db.add(history)

    await db.commit()

    # Re-fetch order for notification
    query = (
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.driver).selectinload(Driver.user))
    )
    result = await db.execute(query)
    order = result.scalars().first()

    # Trigger notifications (wrapped in try-except to not fail the whole request)
    try:
        if order and order.driver and order.driver.user and order.driver.user.fcm_token:
            await notification_service.notify_driver_order_delivered(
                db, order.driver.user_id, order.id, order.driver.user.fcm_token
            )

            # Payment collection - check if payment already exists
            if (
                order.payment_method
                and order.payment_method.upper() in ["CASH", "COD"]
                and order.total_amount > 0
            ):
                # Check if payment already exists
                existing_payment = await db.execute(
                    select(PaymentCollection).where(PaymentCollection.order_id == order.id)
                )
                if not existing_payment.scalars().first():
                    from app.models.financial import PaymentMethod
                    method_enum = PaymentMethod(order.payment_method.upper())
                    payment = PaymentCollection(
                        order_id=order.id,
                        driver_id=order.driver_id,
                        amount=order.total_amount,
                        method=method_enum,
                        collected_at=datetime.utcnow(),
                    )
                    db.add(payment)

                    await notification_service.notify_driver_payment_collected(
                        db,
                        order.driver.user_id,
                        order.id,
                        order.total_amount,
                        order.driver.user.fcm_token,
                    )
    except Exception as e:
        print(f"Error in POD notifications: {e}")
        # Continue - POD was submitted successfully, don't fail on notification errors

    await db.commit()
    return {"msg": "Proof of delivery submitted successfully", "photo_url": pod_data.photo_url}


@router.post("/export")
async def export_orders(
    status: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Export filtered orders.
    """
    import pandas as pd
    import io

    query = select(Order)
    if status is not None:
        query = query.where(Order.status == status)
    if warehouse_id is not None:
        query = query.where(Order.warehouse_id == warehouse_id)

    result = await db.execute(query)
    orders = result.scalars().all()

    data = []
    for o in orders:
        data.append(
            {
                "ID": o.id,
                "Order Number": o.sales_order_number,
                "Status": o.status,
                "Amount": o.total_amount,
                "Created At": o.created_at,
            }
        )

    df = pd.DataFrame(data)
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    stream.seek(0)

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
async def unassign_order(
    order_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.driver_id = None
    order.status = OrderStatus.PENDING

    history = OrderStatusHistory(
        order_id=order.id, status=OrderStatus.PENDING, notes="Unassigned by manager"
    )
    db.add(history)
    db.add(order)
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

    order.status = OrderStatus.REJECTED

    history = OrderStatusHistory(
        order_id=order.id, status=OrderStatus.REJECTED, notes=f"Rejected: {reason}"
    )
    db.add(history)
    db.add(order)
    await db.commit()
    return {"msg": "Order rejected"}


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    reason: Optional[str] = Body(None),
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

    if order.status == OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Cannot cancel a delivered order")

    # Store driver info before cancellation
    previous_driver = order.driver
    previous_driver_user = previous_driver.user if previous_driver else None

    order.status = OrderStatus.CANCELLED

    history = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.CANCELLED,
        notes=f"Cancelled: {reason}" if reason else "Order cancelled",
    )
    db.add(history)
    db.add(order)
    await db.commit()

    # Notify the driver if the order was assigned
    if previous_driver_user:
        await notification_service.notify_driver_order_cancelled(
            db=db,
            user_id=previous_driver_user.id,
            order_id=order.id,
            order_number=order.sales_order_number,
            token=previous_driver_user.fcm_token,
        )
        await db.commit()  # Commit notification

    return {"msg": "Order cancelled successfully"}


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

    order.is_archived = False
    db.add(order)
    await db.commit()
    return {"msg": f"Order {order_id} restored from archive"}


@router.post("/auto-archive")
async def auto_archive_orders(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Auto-archive delivered orders older than 7 days.
    This endpoint is designed to be called by a daily cron job.
    Admin only.
    """

    cutoff_date = datetime.utcnow() - timedelta(days=7)

    # Find delivered orders older than 7 days that aren't archived yet
    stmt = (
        select(Order)
        .where(Order.status == OrderStatus.DELIVERED)
        .where(Order.updated_at < cutoff_date)
        .where(Order.is_archived.is_(False))
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
