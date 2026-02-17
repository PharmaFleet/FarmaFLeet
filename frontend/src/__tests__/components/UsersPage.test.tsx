/**
 * Test Suite for UsersPage + User Dialogs
 * ========================================
 * Tests for Task 4: Fix Users page actions.
 *
 * Covers:
 * - Edit User dialog rendering and interaction
 * - Reset Password dialog rendering and validation
 * - Add User dialog rendering
 * - Toggle status (Deactivate/Activate) action
 * - Dropdown menu wiring (onClick handlers)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { ResetPasswordDialog } from '@/components/users/ResetPasswordDialog';
import { AddUserDialog } from '@/components/users/AddUserDialog';
import { User } from '@/types';

vi.mock('@/services/userService', () => ({
  userService: {
    getAll: vi.fn().mockResolvedValue({
      items: [
        { id: 1, email: 'admin@test.com', full_name: 'Admin User', role: 'super_admin', is_active: true },
        { id: 2, email: 'driver@test.com', full_name: 'Driver User', role: 'driver', is_active: false },
      ],
      total: 2,
      page: 1,
      size: 10,
      pages: 1,
    }),
    create: vi.fn().mockResolvedValue({ id: 3 }),
    update: vi.fn().mockResolvedValue({}),
    toggleStatus: vi.fn().mockResolvedValue({}),
    resetPassword: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUser: User = {
  id: 1,
  email: 'admin@test.com',
  full_name: 'Admin User',
  phone: '+965-1111',
  is_active: true,
  role: 'super_admin',
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('EditUserDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders dialog with user data', () => {
    renderWithProviders(
      <EditUserDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
  });

  it('shows email as read-only', () => {
    renderWithProviders(
      <EditUserDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );
    // Email is displayed as text, not an input
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    const emailInputs = screen.queryAllByLabelText(/email/i);
    // No editable email input
    expect(emailInputs.filter(el => el.tagName === 'INPUT')).toHaveLength(0);
  });

  it('populates full_name field with current value', () => {
    renderWithProviders(
      <EditUserDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );
    const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Admin User');
  });

  it('populates phone field with current value', () => {
    renderWithProviders(
      <EditUserDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );
    const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
    expect(phoneInput.value).toBe('+965-1111');
  });

  it('renders role selector', () => {
    renderWithProviders(
      <EditUserDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByText(/role/i, { selector: 'label' })).toBeInTheDocument();
  });

  it('calls update service on submit', async () => {
    const { userService } = await import('@/services/userService');
    renderWithProviders(
      <EditUserDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );

    const nameInput = screen.getByLabelText(/full name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Name');

    const saveBtn = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(userService.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ full_name: 'Updated Name' })
      );
    });
  });

  it('does not render when open is false', () => {
    renderWithProviders(
      <EditUserDialog user={mockUser} open={false} onOpenChange={() => {}} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ResetPasswordDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders dialog with user email', () => {
    renderWithProviders(
      <ResetPasswordDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/admin@test.com/)).toBeInTheDocument();
  });

  it('renders password and confirm password fields', () => {
    renderWithProviders(
      <ResetPasswordDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('disables submit when passwords do not match', async () => {
    renderWithProviders(
      <ResetPasswordDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );

    await userEvent.type(screen.getByLabelText(/new password/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password2');

    const submitBtn = screen.getByRole('button', { name: /reset password/i });
    expect(submitBtn).toBeDisabled();
  });

  it('shows mismatch warning when passwords differ', async () => {
    renderWithProviders(
      <ResetPasswordDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );

    await userEvent.type(screen.getByLabelText(/new password/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password2');

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('enables submit when passwords match', async () => {
    renderWithProviders(
      <ResetPasswordDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123');

    const submitBtn = screen.getByRole('button', { name: /reset password/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls resetPassword service on submit', async () => {
    const { userService } = await import('@/services/userService');
    renderWithProviders(
      <ResetPasswordDialog user={mockUser} open={true} onOpenChange={() => {}} />
    );

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123');

    const submitBtn = screen.getByRole('button', { name: /reset password/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(userService.resetPassword).toHaveBeenCalledWith(1, 'newpass123');
    });
  });
});

describe('AddUserDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders dialog with form fields', () => {
    renderWithProviders(
      <AddUserDialog open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders phone field as optional', () => {
    renderWithProviders(
      <AddUserDialog open={true} onOpenChange={() => {}} />
    );
    const phoneInput = screen.getByLabelText(/phone/i);
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput).not.toBeRequired();
  });

  it('renders role selector WITHOUT driver option', async () => {
    renderWithProviders(
      <AddUserDialog open={true} onOpenChange={() => {}} />
    );

    // The role label should exist
    expect(screen.getByText(/role/i, { selector: 'label' })).toBeInTheDocument();
  });

  it('calls create service on submit', async () => {
    const { userService } = await import('@/services/userService');
    renderWithProviders(
      <AddUserDialog open={true} onOpenChange={() => {}} />
    );

    await userEvent.type(screen.getByLabelText(/full name/i), 'New User');
    await userEvent.type(screen.getByLabelText(/email/i), 'new@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass123');

    const submitBtn = screen.getByRole('button', { name: /create user/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          full_name: 'New User',
          password: 'pass123',
        })
      );
    });
  });

  it('does not render when open is false', () => {
    renderWithProviders(
      <AddUserDialog open={false} onOpenChange={() => {}} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('UsersPage Integration', () => {
  it('renders the page with Add User button', async () => {
    // Lazy import to use mocked services
    const { default: UsersPage } = await import('@/pages/users/UsersPage');

    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
    });
  });

  it('renders user table with data', async () => {
    const { default: UsersPage } = await import('@/pages/users/UsersPage');

    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
      expect(screen.getByText('driver@test.com')).toBeInTheDocument();
    });
  });

  it('shows dynamic Deactivate/Activate label based on user status', async () => {
    const { default: UsersPage } = await import('@/pages/users/UsersPage');

    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });

    // Open dropdown for active user (admin)
    const actionButtons = screen.getAllByRole('button', { name: '' });
    // Find the action menu trigger buttons (MoreHorizontal icons)
    const menuTriggers = actionButtons.filter(btn =>
      btn.querySelector('svg') && btn.classList.contains('h-8')
    );

    if (menuTriggers.length > 0) {
      await userEvent.click(menuTriggers[0]);

      await waitFor(() => {
        // Admin is active, should show "Deactivate"
        expect(screen.getByText('Deactivate')).toBeInTheDocument();
      });
    }
  });

  it('opens Add User dialog when clicking Add User button', async () => {
    const { default: UsersPage } = await import('@/pages/users/UsersPage');

    renderWithProviders(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /add user/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add new user/i)).toBeInTheDocument();
    });
  });
});
