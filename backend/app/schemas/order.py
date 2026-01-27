from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.order import OrderStatus
from .driver import Driver
from .warehouse import Warehouse


class OrderStatusHistoryBase(BaseModel):
    status: str
    notes: Optional[str] = None


class OrderStatusHistoryCreate(OrderStatusHistoryBase):
    pass


class OrderStatusHistory(OrderStatusHistoryBase):
    id: int
    order_id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)


class ProofOfDeliveryBase(BaseModel):
    signature_url: Optional[str] = None
    photo_url: Optional[str] = None


class ProofOfDeliveryCreate(ProofOfDeliveryBase):
    pass


class ProofOfDelivery(ProofOfDeliveryBase):
    id: int
    order_id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)


class OrderBase(BaseModel):
    sales_order_number: str
    customer_info: Dict[str, Any]
    payment_method: str
    total_amount: float
    warehouse_id: int
    status: OrderStatus = OrderStatus.PENDING


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    driver_id: Optional[int] = None
    payment_method: Optional[str] = None
    customer_info: Optional[Dict[str, Any]] = None


class OrderInDBBase(OrderBase):
    id: int
    driver_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class Order(OrderInDBBase):
    status_history: List[OrderStatusHistory] = []
    proof_of_delivery: Optional[ProofOfDelivery] = None
    driver: Optional[Driver] = None
    warehouse: Optional[Warehouse] = None
