from datetime import datetime, timedelta
import uuid
from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
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
    """
    # Build query
    query = select(Order)
    count_query = select(func.count()).select_from(Order)

    filters = []

    # Archive filter - by default, hide archived orders
    if not include_archived:
        filters.append(Order.is_archived.is_(False))

    if status:
        filters.append(Order.status == status)
    if warehouse_id:
        filters.append(Order.warehouse_id == warehouse_id)
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
    """
    query = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.status_history),
            selectinload(Order.proof_of_delivery),
            selectinload(Order.warehouse),
            selectinload(Order.driver).selectinload(Driver.user),
        )
    )
    result = await db.execute(query)
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
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

                # Ensure a default warehouse exists
                wh_stmt = select(Warehouse).limit(1)
                wh_result = await db.execute(wh_stmt)
                default_wh = wh_result.scalars().first()

                if not default_wh:
                    # Create default warehouse if none exists
                    default_wh = Warehouse(
                        code="WH-DEFAULT",
                        name="Main Warehouse",
                        location=WKTElement("POINT(47.9774 29.3759)", srid=4326),
                    )
                    db.add(default_wh)
                    await db.commit()
                    await db.refresh(default_wh)

                target_wh_id = default_wh.id

                # If we had warehouse code logic, insert here.

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
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

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
        notes=f"Assigned to driver {driver.user_id}",
    )
    db.add(history)
    db.add(order)
    await db.commit()
    await db.refresh(order)

    query = (
        select(Order)
        .where(Order.id == order.id)
        .options(
            selectinload(Order.status_history), selectinload(Order.proof_of_delivery)
        )
    )
    result = await db.execute(query)

    # Notify driver
    if driver.user.fcm_token:
        await notification_service.notify_driver_new_orders(
            db, driver.user_id, 1, driver.user.fcm_token
        )

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

    # Trigger notifications
    if order.driver and order.driver.user and order.driver.user.fcm_token:
        await notification_service.notify_driver_order_delivered(
            db, order.driver.user_id, order.id, order.driver.user.fcm_token
        )

        # Payment collection notification
        if (
            order.payment_method
            and order.payment_method.upper() in ["CASH", "COD"]
            and order.total_amount > 0
        ):
            payment = PaymentCollection(
                order_id=order.id,
                driver_id=order.driver_id,
                amount=order.total_amount,
                method=order.payment_method,
                created_at=datetime.utcnow(),
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

    await db.commit()
    return {"msg": "Proof of delivery uploaded successfully", "photo_url": photo_url}


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

    # Send notifications
    for drv_id, data in driver_notifications.items():
        if data["count"] > 0:
            await notification_service.notify_driver_new_orders(
                db, data["user_id"], data["count"], data["token"]
            )

    return {"assigned": count}


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
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Cannot cancel a delivered order")

    order.status = OrderStatus.CANCELLED

    history = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.CANCELLED,
        notes=f"Cancelled: {reason}" if reason else "Order cancelled",
    )
    db.add(history)
    db.add(order)
    await db.commit()
    return {"msg": "Order cancelled successfully"}


@router.delete("/{order_id}")
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Permanently delete an order (hard deletion).
    Admin only - removes order and all related data (history, POD).
    """
    # Check admin role
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=403, detail="Only administrators can permanently delete orders"
        )

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
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Auto-archive delivered orders older than 7 days.
    This endpoint is designed to be called by a daily cron job.
    Admin only.
    """
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=403, detail="Only administrators can run auto-archive"
        )

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
