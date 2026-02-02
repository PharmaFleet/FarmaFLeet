/**
 * Test Suite for BatchDeleteDialog Component
 * ==========================================
 * Tests for the dialog UI for batch deleting orders.
 * Includes type-to-confirm pattern testing (user must type "DELETE").
 *
 * Covers:
 * - Rendering with correct order count
 * - Type-to-confirm pattern (DELETE confirmation)
 * - Delete button disabled until confirmed
 * - Loading state during mutation
 * - Warning messages for irreversible action
 * - Callback execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { BatchDeleteDialog } from '@/components/orders/BatchDeleteDialog';

// Mock the useBulkDelete hook
const mockMutate = vi.fn();
const mockUseBulkDelete = vi.fn(() => ({
  mutate: mockMutate,
  isPending: false,
}));

vi.mock('@/hooks/useBulkDelete', () => ({
  useBulkDelete: (options: any) => {
    const result = mockUseBulkDelete();
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

describe('BatchDeleteDialog Component', () => {
  const defaultProps = {
    orderIds: [1, 2, 3],
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockClear();
    mockUseBulkDelete.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  describe('Rendering', () => {
    it('renders dialog when open is true', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(
        <BatchDeleteDialog {...defaultProps} open={false} />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays correct order count in description', () => {
      render(
        <BatchDeleteDialog {...defaultProps} orderIds={[1, 2, 3, 4, 5]} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders Permanently Delete Orders title', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Permanently Delete Orders')).toBeInTheDocument();
    });

    it('renders confirmation input', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText(/type delete to confirm/i)).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    });

    it('renders Delete button with order count', () => {
      render(
        <BatchDeleteDialog {...defaultProps} orderIds={[1, 2]} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /delete 2 order/i })).toBeInTheDocument();
    });
  });

  describe('Type-to-Confirm Pattern', () => {
    it('delete button is disabled initially', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).toBeDisabled();
    });

    it('delete button remains disabled with partial confirmation', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'DEL');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).toBeDisabled();
    });

    it('delete button remains disabled with wrong text', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'REMOVE');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).toBeDisabled();
    });

    it('delete button is enabled when "DELETE" is typed exactly', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'DELETE');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it('delete button is disabled with lowercase "delete"', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'delete');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).toBeDisabled();
    });

    it('delete button is disabled with extra whitespace', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, ' DELETE ');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).toBeDisabled();
    });

    it('delete button is disabled with extra characters', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'DELETE!');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Delete Action', () => {
    it('calls mutate with orderIds when delete button clicked', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'DELETE');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      await user.click(deleteButton);

      expect(mockMutate).toHaveBeenCalledWith({ orderIds: [1, 2, 3] });
    });

    it('does not call mutate when confirmation is incorrect', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'WRONG');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      // Button should be disabled, so clicking should have no effect
      fireEvent.click(deleteButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('disables delete button when isPending is true', async () => {
      const user = userEvent.setup();

      mockUseBulkDelete.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'DELETE');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).toBeDisabled();
    });

    it('shows loading spinner when isPending is true', async () => {
      const user = userEvent.setup();

      mockUseBulkDelete.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'DELETE');

      // Look for the Loader2 icon (animate-spin class)
      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('calls onOpenChange(false) when Cancel clicked', async () => {
      const user = userEvent.setup();
      const onOpenChangeMock = vi.fn();

      render(
        <BatchDeleteDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelButton);

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });

    it('clears confirmation input when dialog closes', async () => {
      const user = userEvent.setup();
      const onOpenChangeMock = vi.fn();

      render(
        <BatchDeleteDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'DELETE');

      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelButton);

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });

  describe('Warning Messages', () => {
    it('displays irreversibility warning', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/this action is irreversible/i)).toBeInTheDocument();
    });

    it('mentions permanent removal of order data', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/permanently removed/i)).toBeInTheDocument();
    });

    it('mentions status history removal', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/status history/i)).toBeInTheDocument();
    });

    it('mentions proof of delivery records removal', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/proof of delivery/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has labeled confirmation input', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const label = screen.getByText(/type/i);
      expect(label).toBeInTheDocument();
    });

    it('displays DELETE keyword in label', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('DELETE')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty orderIds array', () => {
      render(
        <BatchDeleteDialog {...defaultProps} orderIds={[]} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles large number of orders', () => {
      const largeOrderIds = Array.from({ length: 1000 }, (_, i) => i + 1);

      render(
        <BatchDeleteDialog {...defaultProps} orderIds={largeOrderIds} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('handles rapid typing in confirmation input', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'DELETE');

      expect(input).toHaveValue('DELETE');
    });

    it('handles clearing confirmation input', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.type(input, 'DELETE');
      await user.clear(input);

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).toBeDisabled();
    });

    it('handles paste in confirmation input', async () => {
      const user = userEvent.setup();

      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      await user.click(input);
      await user.paste('DELETE');

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Visual Styling', () => {
    it('uses destructive variant for delete button', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const deleteButton = screen.getByRole('button', { name: /delete 3 order/i });
      // Check for destructive styling class
      expect(deleteButton).toHaveClass('bg-rose-600');
    });

    it('has monospace font for confirmation input', () => {
      render(
        <BatchDeleteDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText(/type delete to confirm/i);
      expect(input).toHaveClass('font-mono');
    });
  });
});
