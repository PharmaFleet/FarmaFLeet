import { useState, useCallback } from 'react';

const STORAGE_KEY = 'orders-column-order';

export interface ColumnDefinition {
  id: string;
  label: string;
  sortKey?: string;
  resizeKey?: string;
  sortable?: boolean;
  className?: string;
}

export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { id: 'checkbox', label: '', sortable: false },
  { id: 'order_number', label: 'Order #', sortKey: 'sales_order_number', resizeKey: 'order_number', sortable: true },
  { id: 'customer', label: 'Customer', sortKey: 'customer_name', resizeKey: 'customer', sortable: true },
  { id: 'address', label: 'Address', sortKey: 'customer_address', resizeKey: 'address', sortable: true },
  { id: 'status', label: 'Status', sortKey: 'status', resizeKey: 'status', sortable: true },
  { id: 'warehouse', label: 'Warehouse', sortKey: 'warehouse_code', resizeKey: 'warehouse', sortable: true },
  { id: 'driver', label: 'Driver', sortKey: 'driver_name', resizeKey: 'driver', sortable: true },
  { id: 'driver_mobile', label: 'Driver Mobile', resizeKey: 'driver_mobile', sortable: false },
  { id: 'driver_code', label: 'Driver Code', sortKey: 'driver_code', resizeKey: 'driver_code', sortable: true },
  { id: 'payment', label: 'Payment', sortKey: 'payment_method', resizeKey: 'payment', sortable: true },
  { id: 'sales_taker', label: 'Sales Taker', sortKey: 'sales_taker', resizeKey: 'sales_taker', sortable: true },
  { id: 'amount', label: 'Amount', sortKey: 'total_amount', resizeKey: 'amount', sortable: true, className: 'text-right pr-8' },
  { id: 'created', label: 'Created', sortKey: 'created_at', resizeKey: 'created', sortable: true },
  { id: 'assigned', label: 'Assigned', sortKey: 'assigned_at', resizeKey: 'assigned', sortable: true },
  { id: 'picked_up', label: 'Picked Up', sortKey: 'picked_up_at', resizeKey: 'picked_up', sortable: true },
  { id: 'delivered', label: 'Delivered', sortKey: 'delivered_at', resizeKey: 'delivered', sortable: true },
  { id: 'delivery_time', label: 'Delivery Time', resizeKey: 'delivery_time', sortable: false },
  { id: 'actions', label: '', sortable: false },
];

function loadColumnOrder(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const order = JSON.parse(stored);
      // Validate that all columns exist
      const defaultIds = DEFAULT_COLUMNS.map(c => c.id);
      if (Array.isArray(order) && order.every(id => defaultIds.includes(id))) {
        // Add any new columns that weren't in the saved order
        const missing = defaultIds.filter(id => !order.includes(id));
        return [...order, ...missing];
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_COLUMNS.map(c => c.id);
}

function saveColumnOrder(order: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // ignore
  }
}

export function useColumnOrder() {
  const [columnOrder, setColumnOrder] = useState<string[]>(loadColumnOrder);

  const reorderColumns = useCallback((activeId: string, overId: string) => {
    setColumnOrder(prev => {
      const oldIndex = prev.indexOf(activeId);
      const newIndex = prev.indexOf(overId);

      if (oldIndex === -1 || newIndex === -1) return prev;

      const newOrder = [...prev];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, activeId);

      saveColumnOrder(newOrder);
      return newOrder;
    });
  }, []);

  const resetColumnOrder = useCallback(() => {
    const defaultOrder = DEFAULT_COLUMNS.map(c => c.id);
    setColumnOrder(defaultOrder);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const orderedColumns = columnOrder.map(id =>
    DEFAULT_COLUMNS.find(c => c.id === id)
  ).filter((c): c is ColumnDefinition => c !== undefined);

  return {
    columnOrder,
    orderedColumns,
    reorderColumns,
    resetColumnOrder
  };
}
