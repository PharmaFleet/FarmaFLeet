from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.financial import PaymentMethod


class PaymentCollectionBase(BaseModel):
    amount: float
    method: PaymentMethod
    transaction_id: Optional[str] = None


class PaymentCollectionCreate(PaymentCollectionBase):
    order_id: int
    driver_id: int


class PaymentCollectionUpdate(PaymentCollectionBase):
    pass


class PaymentCollectionInDBBase(PaymentCollectionBase):
    id: int
    order_id: int
    driver_id: int
    collected_at: datetime
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class PaymentCollection(PaymentCollectionInDBBase):
    pass
