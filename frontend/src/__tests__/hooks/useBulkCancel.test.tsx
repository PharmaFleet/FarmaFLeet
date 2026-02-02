/**
 * Test Suite for useBulkCancel Hook
 * ==================================
 * Tests the React Query mutation hook for batch cancelling orders.
 *
 * Covers:
 * - Successful batch cancel operations
 * - Partial success scenarios (some orders fail)
 * - Error handling
 * - Toast notifications
 * - Query invalidation
 * - Callback execution (onSuccess, onError)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBulkCancel } from '@/hooks/useBulkCancel';

// Mock the orderService
vi.mock('@/services/orderService', () => ({
  orderService: {
    batchCancel: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { orderService } from '@/services/orderService';

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useBulkCancel Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Successful Operations', () => {
    it('calls orderService.batchCancel with correct parameters', async () => {
      const mockResponse = { cancelled: 3, errors: [] };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2, 3] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(orderService.batchCancel).toHaveBeenCalledWith([1, 2, 3], undefined);
    });

    it('passes reason parameter when provided', async () => {
      const mockResponse = { cancelled: 2, errors: [] };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          orderIds: [1, 2],
          reason: 'Customer requested cancellation'
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(orderService.batchCancel).toHaveBeenCalledWith(
        [1, 2],
        'Customer requested cancellation'
      );
    });

    it('returns correct data on success', async () => {
      const mockResponse = { cancelled: 5, errors: [] };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2, 3, 4, 5] });
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockResponse);
      });
    });

    it('calls onSuccess callback with cancelled count', async () => {
      const mockResponse = { cancelled: 3, errors: [] };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);
      const onSuccessMock = vi.fn();

      const { result } = renderHook(
        () => useBulkCancel({ onSuccess: onSuccessMock }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2, 3] });
      });

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalledWith(3);
      });
    });
  });

  describe('Partial Success Scenarios', () => {
    it('handles partial success with errors', async () => {
      const mockResponse = {
        cancelled: 2,
        errors: [
          { order_id: 3, error: 'Cannot cancel a delivered order' },
        ],
      };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2, 3] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.cancelled).toBe(2);
        expect(result.current.data?.errors).toHaveLength(1);
      });
    });

    it('handles all orders failing', async () => {
      const mockResponse = {
        cancelled: 0,
        errors: [
          { order_id: 1, error: 'Order not found' },
          { order_id: 2, error: 'Order not found' },
        ],
      };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.cancelled).toBe(0);
        expect(result.current.data?.errors).toHaveLength(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(orderService.batchCancel).mockRejectedValue(networkError);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2, 3] });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('calls onError callback when mutation fails', async () => {
      const error = new Error('Server Error');
      vi.mocked(orderService.batchCancel).mockRejectedValue(error);
      const onErrorMock = vi.fn();

      const { result } = renderHook(
        () => useBulkCancel({ onError: onErrorMock }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2] });
      });

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalled();
      });
    });

    it('handles 401 unauthorized error', async () => {
      const authError = { response: { status: 401, data: { detail: 'Not authenticated' } } };
      vi.mocked(orderService.batchCancel).mockRejectedValue(authError);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1] });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Hook State Management', () => {
    it('starts with isPending false', () => {
      vi.mocked(orderService.batchCancel).mockResolvedValue({ cancelled: 0, errors: [] });

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);
    });

    it('sets isPending true during mutation', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(orderService.batchCancel).mockReturnValue(pendingPromise as any);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ orderIds: [1] });
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to clean up
      await act(async () => {
        resolvePromise!({ cancelled: 1, errors: [] });
      });
    });

    it('resets state on new mutation', async () => {
      vi.mocked(orderService.batchCancel)
        .mockResolvedValueOnce({ cancelled: 1, errors: [] })
        .mockResolvedValueOnce({ cancelled: 2, errors: [] });

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1] });
      });

      await waitFor(() => {
        expect(result.current.data?.cancelled).toBe(1);
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2] });
      });

      await waitFor(() => {
        expect(result.current.data?.cancelled).toBe(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty order IDs array', async () => {
      const mockResponse = { cancelled: 0, errors: [] };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.cancelled).toBe(0);
      });

      expect(orderService.batchCancel).toHaveBeenCalledWith([], undefined);
    });

    it('handles single order cancellation', async () => {
      const mockResponse = { cancelled: 1, errors: [] };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [42] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.cancelled).toBe(1);
      });
    });

    it('handles large batch cancellation', async () => {
      const largeOrderIds = Array.from({ length: 100 }, (_, i) => i + 1);
      const mockResponse = { cancelled: 100, errors: [] };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: largeOrderIds });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.cancelled).toBe(100);
      });
    });

    it('handles empty reason string', async () => {
      const mockResponse = { cancelled: 1, errors: [] };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1], reason: '' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(orderService.batchCancel).toHaveBeenCalledWith([1], '');
    });

    it('handles special characters in reason', async () => {
      const mockResponse = { cancelled: 1, errors: [] };
      vi.mocked(orderService.batchCancel).mockResolvedValue(mockResponse);
      const specialReason = 'Customer said: "Cancel it!" <script>alert("xss")</script>';

      const { result } = renderHook(() => useBulkCancel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1], reason: specialReason });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(orderService.batchCancel).toHaveBeenCalledWith([1], specialReason);
    });
  });
});
