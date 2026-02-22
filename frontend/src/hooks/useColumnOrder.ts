import { useState, useCallback } from 'react';

const STORAGE_KEY = 'orders-column-order';
const VISIBILITY_KEY = 'orders-column-visibility';

export interface ColumnDefinition {
  id: string;
  label: string;
  sortKey?: string;
  resizeKey?: string;
  sortable?: boolean;
  className?: string;
}

// All available columns
export const ALL_COLUMNS: ColumnDefinition[] = [
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

// Essential columns visible by default (8 + checkbox + actions)
const DEFAULT_VISIBLE_IDS = new Set([
  'checkbox', 'order_number', 'customer', 'status', 'driver',
  'warehouse', 'amount', 'created', 'actions',
]);

// For backward compatibility
export const DEFAULT_COLUMNS = ALL_COLUMNS;

function loadColumnOrder(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const order = JSON.parse(stored);
      const defaultIds = ALL_COLUMNS.map(c => c.id);
      if (Array.isArray(order) && order.every((id: string) => defaultIds.includes(id))) {
        const missing = defaultIds.filter(id => !order.includes(id));
        return [...order, ...missing];
      }
    }
  } catch {
    // ignore
  }
  return ALL_COLUMNS.map(c => c.id);
}

function saveColumnOrder(order: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // ignore
  }
}

function loadColumnVisibility(): Set<string> {
  try {
    const stored = localStorage.getItem(VISIBILITY_KEY);
    if (stored) {
      const ids = JSON.parse(stored);
      if (Array.isArray(ids)) return new Set(ids);
    }
  } catch {
    // ignore
  }
  return new Set(DEFAULT_VISIBLE_IDS);
}

function saveColumnVisibility(visible: Set<string>) {
  try {
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify([...visible]));
  } catch {
    // ignore
  }
}

export function useColumnOrder() {
  const [columnOrder, setColumnOrder] = useState<string[]>(loadColumnOrder);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(loadColumnVisibility);

  const showAllColumns = visibleColumns.size >= ALL_COLUMNS.length;

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

  const toggleAllColumns = useCallback(() => {
    if (showAllColumns) {
      // Reset to defaults
      setVisibleColumns(new Set(DEFAULT_VISIBLE_IDS));
      saveColumnVisibility(new Set(DEFAULT_VISIBLE_IDS));
    } else {
      // Show all
      const all = new Set(ALL_COLUMNS.map(c => c.id));
      setVisibleColumns(all);
      saveColumnVisibility(all);
    }
  }, [showAllColumns]);

  const toggleColumn = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      saveColumnVisibility(next);
      return next;
    });
  }, []);

  const resetColumnOrder = useCallback(() => {
    const defaultOrder = ALL_COLUMNS.map(c => c.id);
    setColumnOrder(defaultOrder);
    setVisibleColumns(new Set(DEFAULT_VISIBLE_IDS));
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(VISIBILITY_KEY);
    } catch {
      // ignore
    }
  }, []);

  const orderedColumns = columnOrder
    .filter(id => visibleColumns.has(id))
    .map(id => ALL_COLUMNS.find(c => c.id === id))
    .filter((c): c is ColumnDefinition => c !== undefined);

  return {
    columnOrder,
    orderedColumns,
    visibleColumns,
    showAllColumns,
    reorderColumns,
    toggleAllColumns,
    toggleColumn,
    resetColumnOrder,
  };
}
