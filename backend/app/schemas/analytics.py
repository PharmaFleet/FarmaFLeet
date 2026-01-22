from typing import List, Dict, Any
from pydantic import BaseModel


class DeliveryAnalytics(BaseModel):
    total_deliveries: int
    success_rate: float
    average_delivery_time: float


class DriverPerformance(BaseModel):
    driver_id: int
    driver_name: str
    total_orders: int
    delivered_orders: int
    failed_orders: int
    success_rate: float


class WarehouseStats(BaseModel):
    warehouse_id: int
    warehouse_name: str
    total_orders: int
    pending_orders: int
    active_drivers: int


class ExecutiveDashboardStats(BaseModel):
    total_active_orders: int
    total_online_drivers: int
    today_revenue: float
    system_health: str = "Healthy"
