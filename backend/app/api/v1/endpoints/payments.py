from typing import Any, Dict, List, Optional
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, cast, String

from app.api import deps
from app.models.financial import PaymentCollection
from app.models.order import Order
from app.models.user import User
from app.models.driver import Driver
from app.schemas.payment import (
    PaymentCollection as PaymentSchema,
    PaymentCollectionCreate,
)

router = APIRouter()


@router.get("", response_model=Any)
async def read_payments(
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    method: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """
    Retrieve payments with pagination.
    """
    # Apply warehouse access control
    user_warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)

    # Base query: Join Payment -> Driver -> User to get driver name
    query = (
        select(PaymentCollection, User.full_name.label("driver_name"))
        .join(Driver, PaymentCollection.driver_id == Driver.id)
        .join(User, Driver.user_id == User.id)
        .join(Order, PaymentCollection.order_id == Order.id)
    )

    # Count query: Needs to handle joins if we search by driver name
    count_q = (
        select(func.count(PaymentCollection.id))
        .select_from(PaymentCollection)
        .join(Order, PaymentCollection.order_id == Order.id)
    )
    needs_join_for_count = False

    if user_warehouse_ids is not None:
        query = query.where(Order.warehouse_id.in_(user_warehouse_ids))
        count_q = count_q.where(Order.warehouse_id.in_(user_warehouse_ids))

    filters = []
    if search:
        search_term = f"%{search}%"
        filters.append(
            or_(
                PaymentCollection.transaction_id.ilike(search_term),
                cast(PaymentCollection.order_id, String).ilike(search_term),
                User.full_name.ilike(search_term),
            )
        )
        needs_join_for_count = True

    if method and method != "ALL":
        filters.append(PaymentCollection.method == method)

    if status and status != "ALL":
        if status.upper() == "VERIFIED":
            filters.append(PaymentCollection.verified_at.is_not(None))
        elif status.upper() == "PENDING":
            filters.append(PaymentCollection.verified_at.is_(None))

    if filters:
        query = query.where(*filters)
        if needs_join_for_count:
            count_q = count_q.join(
                Driver, PaymentCollection.driver_id == Driver.id
            ).join(User, Driver.user_id == User.id)
        count_q = count_q.where(*filters)

    # Calculate offset
    offset = (page - 1) * limit

    # Get total count
    total = await db.scalar(count_q) or 0

    # Get items
    query = (
        query.order_by(PaymentCollection.collected_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()

    items = []
    for payment, driver_name in rows:
        p_data = PaymentSchema.model_validate(payment)
        p_data.driver_name = driver_name
        items.append(p_data)

    pages = math.ceil(total / limit) if limit > 0 else 0

    return {"items": items, "total": total, "page": page, "size": limit, "pages": pages}


@router.get("/pending", response_model=List[PaymentSchema])
async def read_pending_payments(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all pending payments (not yet verified).
    """
    query = (
        select(PaymentCollection)
        .join(Order, PaymentCollection.order_id == Order.id)
        .where(PaymentCollection.verified_at.is_(None))
    )
    user_warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)
    if user_warehouse_ids is not None:
        query = query.where(Order.warehouse_id.in_(user_warehouse_ids))
    result = await db.execute(query)
    payments = result.scalars().all()
    return payments


@router.post("/collection", response_model=PaymentSchema)
async def collect_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_in: PaymentCollectionCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Record a payment collection from an order.
    """
    # Verify order exists
    order = await db.get(Order, payment_in.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = PaymentCollection(
        order_id=payment_in.order_id,
        driver_id=payment_in.driver_id,  # Typically derived from token if driver
        amount=payment_in.amount,
        method=payment_in.method,
        transaction_id=payment_in.transaction_id,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


@router.post("/{payment_id}/clear")
async def clear_payment(
    payment_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_manager_or_above),
) -> Dict[str, str]:
    """
    Verify/clear a payment collection.
    Manager or admin only.
    """
    payment = await db.get(PaymentCollection, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.verified_by_id = current_user.id
    payment.verified_at = datetime.now(timezone.utc)

    db.add(payment)
    await db.commit()
    return {"msg": "Payment verified successfully"}


@router.get("/report")
async def payment_report(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> List[Dict[str, Any]]:
    """
    Generate payment report.
    """
    query = (
        select(
            PaymentCollection.method, func.sum(PaymentCollection.amount).label("total")
        )
        .join(Order, PaymentCollection.order_id == Order.id)
        .group_by(PaymentCollection.method)
    )
    user_warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)
    if user_warehouse_ids is not None:
        query = query.where(Order.warehouse_id.in_(user_warehouse_ids))

    result = await db.execute(query)
    report = [{"method": row.method, "total": row.total} for row in result]
    return report


@router.get("/export")
async def export_payments(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Export payments to Excel.
    """
    query = (
        select(PaymentCollection)
        .join(Order, PaymentCollection.order_id == Order.id)
        .order_by(PaymentCollection.created_at.desc())
    )
    user_warehouse_ids = await deps.get_user_warehouse_ids(current_user, db)
    if user_warehouse_ids is not None:
        query = query.where(Order.warehouse_id.in_(user_warehouse_ids))
    result = await db.execute(query)
    payments = result.scalars().all()

    data = []
    for p in payments:
        data.append(
            {
                "ID": p.id,
                "Order ID": p.order_id,
                "Amount": p.amount,
                "Method": p.method,
                "Status": "VERIFIED" if p.verified_at else "PENDING",
                "Transaction ID": p.transaction_id,
                "Date": p.created_at,
                "Verified": "Yes" if p.verified_at else "No",
            }
        )

    from app.services.excel import excel_service

    stream = excel_service.write_xlsx(data, sheet_name="Payments")

    headers = {"Content-Disposition": 'attachment; filename="payments.xlsx"'}
    return StreamingResponse(
        stream,
        headers=headers,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
