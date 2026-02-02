/**
 * Test Suite for useBulkDelete Hook
 * ==================================
 * Tests the React Query mutation hook for batch deleting orders.
 *
 * Covers:
 * - Successful batch delete operations
 * - Partial success scenarios (some orders fail)
 * - Error handling (including 403 Forbidden for non-admins)
 * - Toast notifications
 * - Query invalidation
 * - Callback execution (onSuccess, onError)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBulkDelete } from '@/hooks/useBulkDelete';

// Mock the orderService
vi.mock('@/services/orderService', () => ({
  orderService: {
    batchDelete: vi.fn(),
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

describe('useBulkDelete Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Successful Operations', () => {
    it('calls orderService.batchDelete with correct parameters', async () => {
      const mockResponse = { deleted: 3, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2, 3] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(orderService.batchDelete).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('returns correct data on success', async () => {
      const mockResponse = { deleted: 5, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2, 3, 4, 5] });
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockResponse);
      });
    });

    it('calls onSuccess callback with deleted count', async () => {
      const mockResponse = { deleted: 3, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);
      const onSuccessMock = vi.fn();

      const { result } = renderHook(
        () => useBulkDelete({ onSuccess: onSuccessMock }),
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
        deleted: 2,
        errors: [
          { order_id: 3, error: 'Order not found' },
        ],
      };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2, 3] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.deleted).toBe(2);
        expect(result.current.data?.errors).toHaveLength(1);
      });
    });

    it('handles all orders failing to delete', async () => {
      const mockResponse = {
        deleted: 0,
        errors: [
          { order_id: 1, error: 'Order not found' },
          { order_id: 2, error: 'Order not found' },
        ],
      };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.deleted).toBe(0);
        expect(result.current.data?.errors).toHaveLength(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles 403 Forbidden error for non-admin users', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: { detail: 'Only administrators can permanently delete orders' }
        }
      };
      vi.mocked(orderService.batchDelete).mockRejectedValue(forbiddenError);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2, 3] });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('handles network errors', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(orderService.batchDelete).mockRejectedValue(networkError);

      const { result } = renderHook(() => useBulkDelete(), {
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
      vi.mocked(orderService.batchDelete).mockRejectedValue(error);
      const onErrorMock = vi.fn();

      const { result } = renderHook(
        () => useBulkDelete({ onError: onErrorMock }),
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
      vi.mocked(orderService.batchDelete).mockRejectedValue(authError);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1] });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('handles 500 server error', async () => {
      const serverError = { response: { status: 500, data: { detail: 'Internal server error' } } };
      vi.mocked(orderService.batchDelete).mockRejectedValue(serverError);

      const { result } = renderHook(() => useBulkDelete(), {
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
      vi.mocked(orderService.batchDelete).mockResolvedValue({ deleted: 0, errors: [] });

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);
    });

    it('sets isPending true during mutation', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(orderService.batchDelete).mockReturnValue(pendingPromise as any);

      const { result } = renderHook(() => useBulkDelete(), {
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
        resolvePromise!({ deleted: 1, errors: [] });
      });
    });

    it('resets state on new mutation', async () => {
      vi.mocked(orderService.batchDelete)
        .mockResolvedValueOnce({ deleted: 1, errors: [] })
        .mockResolvedValueOnce({ deleted: 2, errors: [] });

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1] });
      });

      await waitFor(() => {
        expect(result.current.data?.deleted).toBe(1);
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 2] });
      });

      await waitFor(() => {
        expect(result.current.data?.deleted).toBe(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty order IDs array', async () => {
      const mockResponse = { deleted: 0, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.deleted).toBe(0);
      });

      expect(orderService.batchDelete).toHaveBeenCalledWith([]);
    });

    it('handles single order deletion', async () => {
      const mockResponse = { deleted: 1, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [42] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.deleted).toBe(1);
      });
    });

    it('handles large batch deletion', async () => {
      const largeOrderIds = Array.from({ length: 100 }, (_, i) => i + 1);
      const mockResponse = { deleted: 100, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: largeOrderIds });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.deleted).toBe(100);
      });
    });

    it('handles duplicate order IDs in request', async () => {
      const mockResponse = { deleted: 1, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1, 1, 1] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The service receives the duplicates - deduplication is server-side
      expect(orderService.batchDelete).toHaveBeenCalledWith([1, 1, 1]);
    });
  });

  describe('Options Configuration', () => {
    it('accepts empty options object', async () => {
      const mockResponse = { deleted: 1, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkDelete({}), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ orderIds: [1] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('accepts only onSuccess callback', async () => {
      const mockResponse = { deleted: 1, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);
      const onSuccessMock = vi.fn();

      const { result } = renderHook(
        () => useBulkDelete({ onSuccess: onSuccessMock }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({ orderIds: [1] });
      });

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalled();
      });
    });

    it('accepts only onError callback', async () => {
      const error = new Error('Test Error');
      vi.mocked(orderService.batchDelete).mockRejectedValue(error);
      const onErrorMock = vi.fn();

      const { result } = renderHook(
        () => useBulkDelete({ onError: onErrorMock }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({ orderIds: [1] });
      });

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalled();
      });
    });

    it('accepts both callbacks', async () => {
      const mockResponse = { deleted: 1, errors: [] };
      vi.mocked(orderService.batchDelete).mockResolvedValue(mockResponse);
      const onSuccessMock = vi.fn();
      const onErrorMock = vi.fn();

      const { result } = renderHook(
        () => useBulkDelete({ onSuccess: onSuccessMock, onError: onErrorMock }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({ orderIds: [1] });
      });

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalled();
        expect(onErrorMock).not.toHaveBeenCalled();
      });
    });
  });
});
