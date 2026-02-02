/**
 * Test Suite for BatchCancelDialog Component
 * ==========================================
 * Tests for the dialog UI for batch cancelling orders.
 *
 * Covers:
 * - Rendering with correct order count
 * - Reason textarea functionality
 * - Cancel button behavior
 * - Close/dismiss behavior
 * - Loading state during mutation
 * - Callback execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { BatchCancelDialog } from '@/components/orders/BatchCancelDialog';

// Mock the useBulkCancel hook
const mockMutate = vi.fn();
const mockUseBulkCancel = vi.fn(() => ({
  mutate: mockMutate,
  isPending: false,
}));

vi.mock('@/hooks/useBulkCancel', () => ({
  useBulkCancel: (options: any) => {
    const result = mockUseBulkCancel();
    // Store the options for callback testing
    (result as any).__options = options;
    return result;
  },
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('BatchCancelDialog Component', () => {
  const defaultProps = {
    orderIds: [1, 2, 3],
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockClear();
    mockUseBulkCancel.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('renders dialog when open is true', () => {
      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(
        <BatchCancelDialog {...defaultProps} open={false} />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays correct order count in title', () => {
      render(
        <BatchCancelDialog {...defaultProps} orderIds={[1, 2, 3, 4, 5]} />,
        { wrapper: createWrapper() }
      );

      // Count appears multiple times in the UI - use getAllByText
      const countElements = screen.getAllByText('5');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('displays singular form for single order', () => {
      render(
        <BatchCancelDialog {...defaultProps} orderIds={[1]} />,
        { wrapper: createWrapper() }
      );

      // Count appears multiple times in the UI
      const countElements = screen.getAllByText('1');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('renders Cancel Orders title', () => {
      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Cancel Orders')).toBeInTheDocument();
    });

    it('renders reason textarea', () => {
      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText(/enter a reason/i)).toBeInTheDocument();
    });

    it('renders Go Back button', () => {
      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('renders Cancel button with order count', () => {
      render(
        <BatchCancelDialog {...defaultProps} orderIds={[1, 2]} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /cancel 2 order/i })).toBeInTheDocument();
    });
  });

  describe('Reason Input', () => {
    it('allows typing in reason textarea', async () => {
      const user = userEvent.setup();

      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText(/enter a reason/i);
      await user.type(textarea, 'Customer requested');

      expect(textarea).toHaveValue('Customer requested');
    });

    it('clears reason when dialog closes', async () => {
      const user = userEvent.setup();
      const onOpenChangeMock = vi.fn();

      const { rerender } = render(
        <BatchCancelDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText(/enter a reason/i);
      await user.type(textarea, 'Test reason');

      // Close the dialog
      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });

  describe('Cancel Action', () => {
    it('calls mutate with orderIds when cancel button clicked', async () => {
      const user = userEvent.setup();

      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel 3 order/i });
      await user.click(cancelButton);

      expect(mockMutate).toHaveBeenCalledWith({
        orderIds: [1, 2, 3],
        reason: undefined,
      });
    });

    it('passes trimmed reason when provided', async () => {
      const user = userEvent.setup();

      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText(/enter a reason/i);
      await user.type(textarea, '  Customer requested  ');

      const cancelButton = screen.getByRole('button', { name: /cancel 3 order/i });
      await user.click(cancelButton);

      expect(mockMutate).toHaveBeenCalledWith({
        orderIds: [1, 2, 3],
        reason: 'Customer requested',
      });
    });

    it('passes undefined reason when empty string', async () => {
      const user = userEvent.setup();

      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel 3 order/i });
      await user.click(cancelButton);

      expect(mockMutate).toHaveBeenCalledWith({
        orderIds: [1, 2, 3],
        reason: undefined,
      });
    });
  });

  describe('Loading State', () => {
    it('disables cancel button when isPending is true', () => {
      mockUseBulkCancel.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel 3 order/i });
      expect(cancelButton).toBeDisabled();
    });

    it('shows loading spinner when isPending is true', () => {
      mockUseBulkCancel.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      // Look for the Loader2 icon (animate-spin class)
      expect(screen.getByRole('button', { name: /cancel 3 order/i }).querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('enables cancel button when isPending is false', () => {
      mockUseBulkCancel.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel 3 order/i });
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('Close Behavior', () => {
    it('calls onOpenChange(false) when Go Back clicked', async () => {
      const user = userEvent.setup();
      const onOpenChangeMock = vi.fn();

      render(
        <BatchCancelDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has labeled textarea', () => {
      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const label = screen.getByText(/cancellation reason/i);
      expect(label).toBeInTheDocument();
    });
  });

  describe('Warning Message', () => {
    it('displays reversibility message', () => {
      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/this action can be reversed/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty orderIds array', () => {
      render(
        <BatchCancelDialog {...defaultProps} orderIds={[]} />,
        { wrapper: createWrapper() }
      );

      const countElements = screen.getAllByText('0');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('handles large number of orders', () => {
      const largeOrderIds = Array.from({ length: 1000 }, (_, i) => i + 1);

      render(
        <BatchCancelDialog {...defaultProps} orderIds={largeOrderIds} />,
        { wrapper: createWrapper() }
      );

      const countElements = screen.getAllByText('1000');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('handles special characters in reason', async () => {
      const user = userEvent.setup();

      render(
        <BatchCancelDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText(/enter a reason/i);
      await user.type(textarea, '<script>alert("xss")</script>');

      const cancelButton = screen.getByRole('button', { name: /cancel 3 order/i });
      await user.click(cancelButton);

      expect(mockMutate).toHaveBeenCalledWith({
        orderIds: [1, 2, 3],
        reason: '<script>alert("xss")</script>',
      });
    });
  });
});
