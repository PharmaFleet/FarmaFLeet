from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.api import deps
from app.models.order import Order, OrderStatus, OrderStatusHistory, ProofOfDelivery
from app.models.user import User
from app.models.driver import Driver
from app.schemas.order import (
    Order as OrderSchema,
    OrderCreate,
    OrderUpdate,
    OrderStatusHistory as OrderStatusHistorySchema,
    ProofOfDeliveryCreate,
)
from app.services.excel import excel_service

router = APIRouter()


@router.get("/", response_model=List[OrderSchema])
async def read_orders(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve orders.
    """
    query = select(Order)

    if status:
        query = query.where(Order.status == status)
    if warehouse_id:
        query = query.where(Order.warehouse_id == warehouse_id)
    if driver_id:
        query = query.where(Order.driver_id == driver_id)

    query = query.order_by(desc(Order.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    orders = result.scalars().all()
    # Pydantic will lazy load relations which might fail with async without greedy loading or explicitly loading steps.
    # For now, simplistic approach. In real async, would need selectinload.
    return orders


@router.get("/{order_id}", response_model=OrderSchema)
async def read_order(
    order_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get order details.
    """
    # Need to load relationships potentially
    # order = await db.get(Order, order_id)
    # Lazy loading doesn't work well with await. Use explicit query with simple get or options.
    query = select(Order).where(Order.id == order_id)
    result = await db.execute(query)
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/import")
async def import_orders(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),  # Manager only usually
) -> Any:
    """
    Import orders from Excel file.
    """
    contents = await file.read()
    import io

    # excel_service expects a file-like object
    data = excel_service.parse_file(io.BytesIO(contents))

    created_count = 0
    errors = []

    for row in data:
        # Validate and create order
        try:
            # Assuming row structure. Typically requires mapping validation.
            # Simplified for prototype.
            order_in = OrderCreate(
                sales_order_number=str(row.get("Order Number")),
                customer_info={
                    "name": row.get("Customer Name"),
                    "phone": row.get("Phone"),
                    "address": row.get("Address"),
                    "area": row.get("Area"),
                },
                total_amount=float(row.get("Amount", 0)),
                payment_method=row.get("Payment Method", "CASH"),
                warehouse_id=1,  # Default or derived from row
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
            errors.append({"row": row, "error": str(e)})

    await db.commit()
    return {"created": created_count, "errors": errors}


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

    # Add history
    history = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.ASSIGNED,
        notes=f"Assigned to driver {driver.user_id}",  # logic for name better
    )
    db.add(history)
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: OrderStatus = Body(..., embed=True),
    notes: Optional[str] = Body(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update order status (Driver or Manager).
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
    return order


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
    Export filtered orders to Excel.
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
    # openpyxl should be installed
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
    Batch assign orders to drivers.
    assignments: [{"order_id": 1, "driver_id": 2}, ...]
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
    """
    Reassign an order to a different driver.
    """
    # Reuse assign logic
    return await assign_order(order_id, driver_id, db, current_user)


@router.post("/{order_id}/unassign")
async def unassign_order(
    order_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Unassign an order from a driver.
    """
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
    """
    Reject an order.
    """
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
