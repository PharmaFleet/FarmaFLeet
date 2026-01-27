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
from app.schemas.order import (
    Order as OrderSchema,
    OrderCreate,
    ProofOfDeliveryCreate,
)
from app.services.excel import excel_service
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
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve orders with pagination.
    """
    # Build query
    query = select(Order)
    count_query = select(func.count()).select_from(Order)

    filters = []
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

                target_wh_id = 1

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
                    payment_method="CASH",
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

    driver = await db.get(Driver, driver_id)
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
            selectinload(Order.status_history), selectinload(Order.proof_of_delivery)
        )
    )
    result = await db.execute(query)
    return result.scalars().first()


@router.post("/{order_id}/proof-of-delivery")
async def upload_proof_of_delivery(
    order_id: int,
    pod_in: ProofOfDeliveryCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload proof of delivery.
    """
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    pod = ProofOfDelivery(
        order_id=order.id,
        signature_url=pod_in.signature_url,
        photo_url=pod_in.photo_url,
    )
    db.add(pod)

    order.status = OrderStatus.DELIVERED
    history = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.DELIVERED,
        notes="Proof of delivery uploaded",
    )
    db.add(history)

    await db.commit()
    return {"msg": "Proof of delivery uploaded successfully"}


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
    for assign in assignments:
        order_id = assign.get("order_id")
        driver_id = assign.get("driver_id")
        if not order_id or not driver_id:
            continue

        order = await db.get(Order, order_id)
        driver = await db.get(Driver, driver_id)

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

    await db.commit()
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
