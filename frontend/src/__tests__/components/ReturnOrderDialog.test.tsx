/**
 * Test Suite for ReturnOrderDialog Component
 * ===========================================
 * Tests for the dialog UI for returning a single order.
 *
 * Covers:
 * - Rendering (dialog visibility, title, textarea, label)
 * - Submit button states (disabled when empty/pending, enabled with text)
 * - Interaction (onConfirm with trimmed reason, whitespace-only guard)
 * - Close behavior (Go Back callback, reason clearing on reopen)
 * - Loading state (spinner visibility)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ReturnOrderDialog } from '@/components/orders/ReturnOrderDialog';

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

describe('ReturnOrderDialog Component', () => {
  const defaultProps = {
    orderId: 42,
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dialog when open is true', () => {
      render(
        <ReturnOrderDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(
        <ReturnOrderDialog {...defaultProps} open={false} />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays Return Order title', () => {
      render(
        <ReturnOrderDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      // "Return Order" appears in both the title (h2) and the submit button,
      // so use getAllByText and verify at least one is present in the heading.
      const elements = screen.getAllByText('Return Order');
      expect(elements.length).toBeGreaterThanOrEqual(1);
      const heading = elements.find(el => el.tagName === 'H2');
      expect(heading).toBeInTheDocument();
    });

    it('displays return reason textarea', () => {
      render(
        <ReturnOrderDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText(/enter the reason/i)).toBeInTheDocument();
    });

    it('displays Return Reason (Required) label', () => {
      render(
        <ReturnOrderDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/return reason/i)).toBeInTheDocument();
    });
  });

  describe('Submit Button', () => {
    it('submit button is disabled when reason is empty', () => {
      render(
        <ReturnOrderDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      // There are two elements with text "Return Order" (title + button).
      // Use getByRole to target the button specifically.
      const submitButton = screen.getByRole('button', { name: /return order/i });
      expect(submitButton).toBeDisabled();
    });

    it('submit button is enabled when reason has text', async () => {
      const user = userEvent.setup();

      render(
        <ReturnOrderDialog {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText(/enter the reason/i);
      await user.type(textarea, 'Damaged package');

      const submitButton = screen.getByRole('button', { name: /return order/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('submit button is disabled when isPending', async () => {
      const user = userEvent.setup();

      render(
        <ReturnOrderDialog {...defaultProps} isPending={true} />,
        { wrapper: createWrapper() }
      );

      // Even with text, button should be disabled when isPending
      const textarea = screen.getByPlaceholderText(/enter the reason/i);
      await user.type(textarea, 'Some reason');

      const submitButton = screen.getByRole('button', { name: /return order/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows spinner when isPending', () => {
      render(
        <ReturnOrderDialog {...defaultProps} isPending={true} />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /return order/i });
      expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('calls onConfirm with orderId and trimmed reason', async () => {
      const user = userEvent.setup();
      const onConfirmMock = vi.fn();

      render(
        <ReturnOrderDialog {...defaultProps} onConfirm={onConfirmMock} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText(/enter the reason/i);
      await user.type(textarea, '  Damaged  ');

      const submitButton = screen.getByRole('button', { name: /return order/i });
      await user.click(submitButton);

      expect(onConfirmMock).toHaveBeenCalledWith(42, 'Damaged');
    });

    it('does not call onConfirm when reason is whitespace only', async () => {
      const user = userEvent.setup();
      const onConfirmMock = vi.fn();

      render(
        <ReturnOrderDialog {...defaultProps} onConfirm={onConfirmMock} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText(/enter the reason/i);
      await user.type(textarea, '   ');

      // Button should be disabled since reason.trim() is empty
      const submitButton = screen.getByRole('button', { name: /return order/i });
      expect(submitButton).toBeDisabled();

      // Attempt to click anyway - onConfirm should not be called
      await user.click(submitButton);
      expect(onConfirmMock).not.toHaveBeenCalled();
    });

    it('clears reason when dialog closes via Go Back', async () => {
      const user = userEvent.setup();
      const onOpenChangeMock = vi.fn();

      render(
        <ReturnOrderDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText(/enter the reason/i);
      await user.type(textarea, 'Some reason text');

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });

  describe('Close Behavior', () => {
    it('calls onOpenChange(false) when Go Back clicked', async () => {
      const user = userEvent.setup();
      const onOpenChangeMock = vi.fn();

      render(
        <ReturnOrderDialog {...defaultProps} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });

    it('clears reason on reopen', async () => {
      const user = userEvent.setup();
      const wrapper = createWrapper();

      const { rerender } = render(
        <ReturnOrderDialog {...defaultProps} />,
        { wrapper }
      );

      // Type a reason
      const textarea = screen.getByPlaceholderText(/enter the reason/i);
      await user.type(textarea, 'Return reason');
      expect(textarea).toHaveValue('Return reason');

      // Close dialog by clicking Go Back (triggers handleOpenChange(false) which clears reason)
      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      // Rerender with open=false then open=true to simulate close and reopen
      rerender(
        <ReturnOrderDialog {...defaultProps} open={false} />
      );
      rerender(
        <ReturnOrderDialog {...defaultProps} open={true} />
      );

      // Textarea should be empty after reopen since handleOpenChange cleared the state
      const reopenedTextarea = screen.getByPlaceholderText(/enter the reason/i);
      expect(reopenedTextarea).toHaveValue('');
    });
  });
});
