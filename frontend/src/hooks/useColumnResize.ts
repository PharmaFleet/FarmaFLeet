import { useState, useCallback, useRef } from 'react';

interface ColumnWidths {
  [key: string]: number;
}

function storageKey(userId?: number) {
  return userId ? `orders-column-widths:user-${userId}` : 'orders-column-widths';
}

const DEFAULT_WIDTHS: ColumnWidths = {
  checkbox: 50,
  order_number: 140,
  customer: 160,
  address: 200,
  status: 110,
  warehouse: 100,
  driver: 140,
  driver_mobile: 120,
  driver_code: 100,
  payment: 100,
  sales_taker: 120,
  amount: 120,
  created: 100,
  assigned: 100,
  picked_up: 100,
  delivered: 100,
  delivery_time: 100,
  actions: 80,
};

function loadWidths(userId?: number): ColumnWidths {
  try {
    const stored = localStorage.getItem(storageKey(userId));
    if (stored) {
      return { ...DEFAULT_WIDTHS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_WIDTHS };
}

function saveWidths(widths: ColumnWidths, userId?: number) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(widths));
  } catch {
    // ignore
  }
}

export function useColumnResize(userId?: number) {
  const [widths, setWidths] = useState<ColumnWidths>(() => loadWidths(userId));
  const resizingRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null);

  const onMouseDown = useCallback((column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      column,
      startX: e.clientX,
      startWidth: widths[column] || DEFAULT_WIDTHS[column] || 100,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(50, resizingRef.current.startWidth + diff);
      setWidths(prev => {
        const updated = { ...prev, [resizingRef.current!.column]: newWidth };
        return updated;
      });
    };

    const onMouseUp = () => {
      if (resizingRef.current) {
        setWidths(prev => {
          saveWidths(prev, userId);
          return prev;
        });
        resizingRef.current = null;
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [widths, userId]);

  const resetWidths = useCallback(() => {
    setWidths({ ...DEFAULT_WIDTHS });
    try {
      localStorage.removeItem(storageKey(userId));
    } catch {
      // ignore
    }
  }, [userId]);

  return { widths, onMouseDown, resetWidths, DEFAULT_WIDTHS };
}
