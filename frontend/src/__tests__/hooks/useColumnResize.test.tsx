/**
 * Test Suite for useColumnResize Hook
 * ====================================
 * Tests the column resize hook used by the orders table
 * for persisting column widths to localStorage.
 *
 * Covers:
 * - Default width initialization
 * - Restoring widths from localStorage
 * - resetWidths restoring defaults and clearing storage
 * - DEFAULT_WIDTHS export
 * - onMouseDown function type
 * - All expected column keys present
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnResize } from '@/hooks/useColumnResize';

const STORAGE_KEY = 'orders-column-widths';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

describe('useColumnResize Hook', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with default widths when no localStorage', () => {
      const { result } = renderHook(() => useColumnResize());

      expect(result.current.widths.checkbox).toBe(50);
      expect(result.current.widths.order_number).toBe(140);
      expect(result.current.widths.customer).toBe(160);
      expect(result.current.widths.address).toBe(200);
      expect(result.current.widths.status).toBe(110);
      expect(result.current.widths.warehouse).toBe(100);
      expect(result.current.widths.driver).toBe(140);
      expect(result.current.widths.actions).toBe(80);
    });

    it('restores widths from localStorage', () => {
      const customWidths = { order_number: 200, customer: 250 };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(customWidths));

      const { result } = renderHook(() => useColumnResize());

      // Custom widths should be restored
      expect(result.current.widths.order_number).toBe(200);
      expect(result.current.widths.customer).toBe(250);
      // Non-customized widths should still have defaults
      expect(result.current.widths.checkbox).toBe(50);
      expect(result.current.widths.actions).toBe(80);
    });
  });

  describe('Reset', () => {
    it('resetWidths restores defaults and clears localStorage', () => {
      const customWidths = { order_number: 300, customer: 400, address: 500 };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(customWidths));

      const { result } = renderHook(() => useColumnResize());

      // Verify custom widths are loaded
      expect(result.current.widths.order_number).toBe(300);

      // Reset widths
      act(() => {
        result.current.resetWidths();
      });

      // Widths should be back to defaults
      expect(result.current.widths.order_number).toBe(140);
      expect(result.current.widths.customer).toBe(160);
      expect(result.current.widths.address).toBe(200);

      // localStorage should have removeItem called
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe('Returned Values', () => {
    it('DEFAULT_WIDTHS is returned', () => {
      const { result } = renderHook(() => useColumnResize());

      const defaultWidths = result.current.DEFAULT_WIDTHS;
      expect(defaultWidths).toBeDefined();
      expect(defaultWidths.checkbox).toBe(50);
      expect(defaultWidths.order_number).toBe(140);
      expect(defaultWidths.customer).toBe(160);
      expect(defaultWidths.address).toBe(200);
      expect(defaultWidths.actions).toBe(80);
    });

    it('onMouseDown is a function', () => {
      const { result } = renderHook(() => useColumnResize());

      expect(typeof result.current.onMouseDown).toBe('function');
    });
  });

  describe('Column Keys', () => {
    it('widths has all expected column keys', () => {
      const { result } = renderHook(() => useColumnResize());

      const expectedKeys = [
        'checkbox',
        'order_number',
        'customer',
        'address',
        'status',
        'warehouse',
        'driver',
        'driver_mobile',
        'driver_code',
        'payment',
        'sales_taker',
        'amount',
        'created',
        'assigned',
        'picked_up',
        'delivered',
        'delivery_time',
        'actions',
      ];

      for (const key of expectedKeys) {
        expect(result.current.widths).toHaveProperty(key);
        expect(typeof result.current.widths[key]).toBe('number');
      }
    });
  });
});
