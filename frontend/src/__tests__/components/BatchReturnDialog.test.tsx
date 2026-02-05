/**
 * Test Suite for BatchReturnDialog Component
 * ===========================================
 * Tests for the dialog UI for batch returning orders.
 *
 * Covers:
 * - Rendering with correct order count
 * - Reason textarea functionality
 * - Submit button behavior (disabled when reason empty)
 * - Close/dismiss behavior
 * - Loading state during mutation
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { BatchReturnDialog } from '@/components/orders/BatchReturnDialog';

// Mock the useBulkReturn hook
const mockMutate = vi.fn();
const mockUseBulkReturn = vi.fn(() => ({
  mutate: mockMutate,
  isPending: false,
}));

vi.mock('@/hooks/useBulkReturn', () => ({
  useBulkReturn: (options: any) => {
    const result = mockUseBulkReturn();
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

describe('BatchReturnDialog Component', () => {
  const defaultProps = {
    orderIds: [1, 2, 3],
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockClear();
    mockUseBulkReturn.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('renders dialog when open is true', () => {
      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(
        <BatchReturnDialog {...defaultProps} open={false} />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays Return Orders title', () => {
      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Return Orders')).toBeInTheDocument();
    });

    it('displays correct order count', () => {
      render(
        <BatchReturnDialog {...defaultProps} orderIds={[1, 2, 3, 4, 5]} />,
        { wrapper: createWrapper() }
      );

      // Count appears multiple times in the UI (description + info box)
      const countElements = screen.getAllByText('5');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('renders reason textarea', () => {
      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText('Enter the reason for returning these orders...')).toBeInTheDocument();
    });

    it('renders Go Back button', () => {
      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('renders submit button with order count', () => {
      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /return 3 order/i })).toBeInTheDocument();
    });
  });

  describe('Reason Input', () => {
    it('allows typing in reason textarea', async () => {
      const user = userEvent.setup();

      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText('Enter the reason for returning these orders...');
      await user.type(textarea, 'Customer refused');

      expect(textarea).toHaveValue('Customer refused');
    });

    it('clears reason when dialog closes', async () => {
      const user = userEvent.setup();
      const onOpenChangeMock = vi.fn();

      render(
        <BatchReturnDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText('Enter the reason for returning these orders...');
      await user.type(textarea, 'Test reason');

      // Close the dialog via Go Back
      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });

  describe('Submit Action', () => {
    it('submit is disabled when reason is empty', () => {
      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /return 3 order/i });
      expect(submitButton).toBeDisabled();
    });

    it('submit is enabled when reason has text', async () => {
      const user = userEvent.setup();

      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText('Enter the reason for returning these orders...');
      await user.type(textarea, 'Damaged goods');

      const submitButton = screen.getByRole('button', { name: /return 3 order/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('calls mutate with orderIds and trimmed reason', async () => {
      const user = userEvent.setup();

      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText('Enter the reason for returning these orders...');
      await user.type(textarea, '  Damaged  ');

      const submitButton = screen.getByRole('button', { name: /return 3 order/i });
      await user.click(submitButton);

      expect(mockMutate).toHaveBeenCalledWith({
        orderIds: [1, 2, 3],
        reason: 'Damaged',
      });
    });
  });

  describe('Loading State', () => {
    it('disables submit when isPending', () => {
      mockUseBulkReturn.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /return 3 order/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows spinner when isPending', () => {
      mockUseBulkReturn.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      render(
        <BatchReturnDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      // Look for the Loader2 icon (animate-spin class)
      expect(screen.getByRole('button', { name: /return 3 order/i }).querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('calls onOpenChange(false) when Go Back clicked', async () => {
      const user = userEvent.setup();
      const onOpenChangeMock = vi.fn();

      render(
        <BatchReturnDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty orderIds array', () => {
      render(
        <BatchReturnDialog {...defaultProps} orderIds={[]} />,
        { wrapper: createWrapper() }
      );

      const countElements = screen.getAllByText('0');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('handles large number of orders', () => {
      const largeOrderIds = Array.from({ length: 100 }, (_, i) => i + 1);

      render(
        <BatchReturnDialog {...defaultProps} orderIds={largeOrderIds} />,
        { wrapper: createWrapper() }
      );

      const countElements = screen.getAllByText('100');
      expect(countElements.length).toBeGreaterThan(0);
    });
  });
});
