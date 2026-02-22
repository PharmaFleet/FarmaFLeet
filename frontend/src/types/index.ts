export interface User {
  id: number;
  email: string;
  full_name?: string;
  phone?: string;
  is_active: boolean;
  role: string; // 'super_admin', 'warehouse_manager', 'dispatcher', 'executive'
  warehouse_id?: number;
}

export interface Driver {
  id: number;
  user_id: number;
  is_available: boolean;
  code?: string;
  vehicle_info?: string;
  vehicle_type?: string; // "car" or "motorcycle"
  biometric_id?: string;
  warehouse_id?: number;
  user?: User; // Optional if joined
  warehouse?: Warehouse; // Optional if joined
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  latitude?: number;
  longitude?: number;
}

export enum OrderStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  PICKED_UP = "picked_up",
  IN_TRANSIT = "in_transit",
  OUT_FOR_DELIVERY = "out_for_delivery",
  DELIVERED = "delivered",
  REJECTED = "rejected",
  RETURNED = "returned",
  CANCELLED = "cancelled",
  FAILED = "failed",
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  status: OrderStatus;
  notes?: string;
  timestamp: string; // ISO date string
}

export interface ProofOfDelivery {
  id: number;
  order_id: number;
  signature_url?: string;
  photo_url?: string;
  timestamp: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  area?: string;
  block?: string;
  street?: string;
  house?: string;
  [key: string]: any;
}

export interface Order {
  id: number;
  sales_order_number: string;
  customer_info: CustomerInfo;
  payment_method: string;
  total_amount: number;
  warehouse_id: number;
  driver_id?: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
  delivered_at?: string;
  assigned_at?: string;
  picked_up_at?: string;
  notes?: string;
  sales_taker?: string;
  status_history?: OrderStatusHistory[];
  proof_of_delivery?: ProofOfDelivery;
  driver?: Driver;
  warehouse?: Warehouse;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface AnalyticsMetrics {
  total_orders_today: number;
  unassigned_today: number;
  active_drivers: number;
  pending_payments_amount: number;
  pending_payments_count: number;
  total_deliveries_all_time: number;
  success_rate: number;
  all_time_success_rate: number;
}

export interface DailyOrderData {
  date: string;
  total: number;
  delivered: number;
  pending: number;
}

export interface DriverPerformanceData {
  driver_id: number;
  total_orders: number;
  delivered_orders: number;
  failed_orders: number;
  success_rate: number;
}

export interface WarehouseOrderData {
  warehouse: string;
  orders: number;
}
