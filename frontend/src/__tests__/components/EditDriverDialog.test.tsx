/**
 * Test Suite for EditDriverDialog Component
 * ==========================================
 * TDD tests for adding name and phone editing capabilities
 * to the driver edit dialog.
 *
 * Covers:
 * - Phone input field rendering
 * - Name input field rendering
 * - Form population with current values
 * - Mutation payload includes user fields
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditDriverDialog } from '@/components/drivers/EditDriverDialog';
import { Driver } from '@/types';

// Mock the services
vi.mock('@/services/driverService', () => ({
  driverService: {
    update: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/warehouseService', () => ({
  warehouseService: {
    getAll: vi.fn().mockResolvedValue([
      { id: 1, name: 'Warehouse 1', code: 'WH001' },
      { id: 2, name: 'Warehouse 2', code: 'WH002' },
    ]),
  },
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createMockDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: 1,
  user_id: 10,
  is_available: true,
  code: 'D001',
  vehicle_info: 'ABC 123',
  vehicle_type: 'car',
  biometric_id: 'BIO001',
  warehouse_id: 1,
  user: {
    id: 10,
    email: 'driver@test.com',
    full_name: 'John Driver',
    phone: '+965-1234-5678',
    is_active: true,
    role: 'driver',
  },
  warehouse: {
    id: 1,
    name: 'Main Warehouse',
    code: 'WH001',
  },
  ...overrides,
});

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('EditDriverDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Name Field', () => {
    it('should render name input field', () => {
      const driver = createMockDriver();
      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      const nameInput = screen.getByLabelText(/driver name/i);
      expect(nameInput).toBeInTheDocument();
    });

    it('should display current driver name value', () => {
      const driver = createMockDriver({ user: { ...createMockDriver().user!, full_name: 'Test Driver Name' } });
      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      const nameInput = screen.getByLabelText(/driver name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Test Driver Name');
    });

    it('should allow editing driver name', async () => {
      const driver = createMockDriver();
      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      const nameInput = screen.getByLabelText(/driver name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'New Driver Name');

      expect(nameInput).toHaveValue('New Driver Name');
    });
  });

  describe('Phone Field', () => {
    it('should render phone input field', () => {
      const driver = createMockDriver();
      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      const phoneInput = screen.getByLabelText(/phone/i);
      expect(phoneInput).toBeInTheDocument();
    });

    it('should display current phone value', () => {
      const driver = createMockDriver({ user: { ...createMockDriver().user!, phone: '+965-9999-8888' } });
      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
      expect(phoneInput.value).toBe('+965-9999-8888');
    });

    it('should allow editing phone number', async () => {
      const driver = createMockDriver();
      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      const phoneInput = screen.getByLabelText(/phone/i);
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '+965-1111-2222');

      expect(phoneInput).toHaveValue('+965-1111-2222');
    });

    it('should have tel type for phone input', () => {
      const driver = createMockDriver();
      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      const phoneInput = screen.getByLabelText(/phone/i);
      expect(phoneInput).toHaveAttribute('type', 'tel');
    });
  });

  describe('Form Submission', () => {
    it('should include user_full_name in mutation payload when changed', async () => {
      const { driverService } = await import('@/services/driverService');
      const driver = createMockDriver();

      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      // Change the name
      const nameInput = screen.getByLabelText(/driver name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Name');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(driverService.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            user_full_name: 'Updated Name',
          })
        );
      });
    });

    it('should include user_phone in mutation payload when changed', async () => {
      const { driverService } = await import('@/services/driverService');
      const driver = createMockDriver();

      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      // Change the phone
      const phoneInput = screen.getByLabelText(/phone/i);
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '+965-new-phone');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(driverService.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            user_phone: '+965-new-phone',
          })
        );
      });
    });

    it('should include all fields in mutation payload', async () => {
      const { driverService } = await import('@/services/driverService');
      const driver = createMockDriver();

      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      // Change multiple fields
      const nameInput = screen.getByLabelText(/driver name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'New Name');

      const phoneInput = screen.getByLabelText(/phone/i);
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '+965-0000-0000');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(driverService.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            user_full_name: 'New Name',
            user_phone: '+965-0000-0000',
            vehicle_info: 'ABC 123',
            vehicle_type: 'car',
          })
        );
      });
    });
  });

  describe('Empty User Handling', () => {
    it('should handle driver without user gracefully', () => {
      const driver = createMockDriver({ user: undefined });
      renderWithProviders(
        <EditDriverDialog driver={driver} open={true} onOpenChange={() => {}} />
      );

      // Should render without crashing
      const nameInput = screen.getByLabelText(/driver name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('');

      const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
      expect(phoneInput.value).toBe('');
    });
  });
});
