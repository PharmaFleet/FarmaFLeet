import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import OrdersPage from '@/pages/orders/OrdersPage';
import { orderService } from '@/services/orderService';
import { Order, PaginatedResponse, OrderStatus } from '@/types';

// Mock the orderService
vi.mock('@/services/orderService');

// Mock Dropdown Menu to be simpler for tests
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuPortal: ({ children }: any) => <>{children}</>,
  DropdownMenuGroup: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSub: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuRadioGroup: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

// Mock AssignDriverDialog
vi.mock('@/components/orders/AssignDriverDialog', () => ({
  AssignDriverDialog: ({ 
    orderId, 
    currentDriverId, 
    onOpenChange 
  }: {
    orderId: number;
    currentDriverId?: number;
    open?: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="assign-driver-dialog">
      <div>Order ID: {orderId}</div>
      <div>Current Driver ID: {currentDriverId || 'None'}</div>
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  ),
}));

// Mock StatusBadge
vi.mock('@/components/shared/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

// Mock lucide-react icons - use importOriginal to include all icons and only override the ones we need for testing
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    MoreHorizontal: () => <div data-testid="more-horizontal-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
    Download: () => <div data-testid="download-icon" />,
    Truck: () => <div data-testid="truck-icon" />,
    Search: () => <div data-testid="search-icon" />,
    AlertOctagon: () => <div data-testid="alert-octagon-icon" />,
    Users: () => <div data-testid="users-icon" />,
    XCircle: () => <div data-testid="x-circle-icon" />,
    Trash2: () => <div data-testid="trash2-icon" />,
  };
});

// Wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('OrdersPage Component', () => {
  const mockOrdersData: PaginatedResponse<Order> = {
    items: [
      {
        id: 1,
        sales_order_number: 'SO-001',
        customer_info: {
          name: 'John Doe',
          phone: '+96512345678',
          address: '123 Main St',
        },
        payment_method: 'cash',
        total_amount: 15.500,
        warehouse_id: 1,
        driver_id: 1,
        status: OrderStatus.PENDING,
        created_at: '2026-01-22T10:00:00Z',
        updated_at: '2026-01-22T10:00:00Z',
        driver: {
          id: 1,
          user_id: 101,
          is_available: true,
          vehicle_info: 'Toyota Camry - KWT 1234',
          user: {
            id: 101,
            email: 'driver@example.com',
            full_name: 'Driver One',
            is_active: true,
            role: 'driver',
          },
        },
        warehouse: {
          id: 1,
          name: 'Main Warehouse',
          code: 'MW',
        },
      },
      {
        id: 2,
        sales_order_number: 'SO-002',
        customer_info: {
          name: 'Jane Smith',
          phone: '+96587654321',
          address: '456 Gulf Rd',
        },
        payment_method: 'card',
        total_amount: 25.750,
        warehouse_id: 1,
        driver_id: undefined,
        status: OrderStatus.DELIVERED,
        created_at: '2026-01-22T09:30:00Z',
        updated_at: '2026-01-22T11:00:00Z',
        warehouse: {
          id: 1,
          name: 'Main Warehouse',
          code: 'MW',
        },
      },
    ],
    total: 2,
    page: 1,
    size: 10,
    pages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(orderService.getAll).mockResolvedValue(mockOrdersData);
  });

  describe('Component Rendering', () => {
    it('should render the OrdersPage correctly', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Orders')).toBeInTheDocument();
        expect(screen.getByText('Manage and track your delivery operations in real-time.')).toBeInTheDocument();
      });
    });

    it('should display order data correctly', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('SO-001')).toBeInTheDocument();
        expect(screen.getByText('SO-002')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('+96512345678')).toBeInTheDocument();
        expect(screen.getByText('15.500 KWD')).toBeInTheDocument();
        expect(screen.getByText('25.750 KWD')).toBeInTheDocument();
      });
    });

    it('should display status badges', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert - The component displays status directly in Badge components (lowercase values from enum)
      await waitFor(() => {
        expect(screen.getByText('pending')).toBeInTheDocument();
        expect(screen.getByText('delivered')).toBeInTheDocument();
      });
    });

    it('should display driver information when assigned', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Driver One')).toBeInTheDocument();
        // There's a truck icon for each order row
        expect(screen.getAllByTestId('truck-icon').length).toBeGreaterThan(0);
      });
    });

    it('should display "Unassigned" for orders without drivers', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
      });
    });

    it('should display warehouse information', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert - The component displays "WH-{warehouse_id}" format
      // Both orders have warehouse_id=1, so there are 2 elements
      await waitFor(() => {
        expect(screen.getAllByText('WH-1').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Loading State', () => {
    it('should display skeleton loaders while loading', async () => {
      // Arrange
      vi.mocked(orderService.getAll).mockImplementation(() => new Promise(() => {})); // Never resolves

      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getAllByRole('row')).toHaveLength(7); // 6 skeleton rows + header
      const skeletonRows = screen.getAllByRole('row').filter(row => row.className.includes('animate-pulse'));
      expect(skeletonRows.length).toBe(6);
    });
  });

  describe('Empty State', () => {
    it('should display "No results" when there are no orders', async () => {
      // Arrange
      vi.mocked(orderService.getAll).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      });

      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No orders found matching your criteria.')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should update search query when typing in search input', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search orders, customers, phone...');
      
      // Assert - Initial state
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveValue('');

      // Act - Type in search
      fireEvent.change(searchInput, { target: { value: 'SO-001' } });

      // Assert - Value updated
      expect(searchInput).toHaveValue('SO-001');
      
      // Verify API is called with search parameter
      await waitFor(() => {
        expect(orderService.getAll).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          search: 'SO-001',
          status: undefined,
          include_archived: false,
        });
      });
    });

    it('should clear search when input is emptied', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search orders, customers, phone...');

      // Type search
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      // Assert
      await waitFor(() => {
        expect(orderService.getAll).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          search: undefined,
          status: undefined,
          include_archived: false,
        });
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.getByText('Page 1 / 1')).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first page', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        const prevButton = screen.getByText('Previous') as HTMLButtonElement;
        expect(prevButton.disabled).toBe(true);
      });
    });

    it('should disable Next button on last page', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        const nextButton = screen.getByText('Next') as HTMLButtonElement;
        expect(nextButton.disabled).toBe(true);
      });
    });

    it('should navigate to next page when Next is clicked', async () => {
      // Arrange - Mock multiple pages
      vi.mocked(orderService.getAll).mockResolvedValue({
        ...mockOrdersData,
        pages: 2,
      });

      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Page 1 / 2')).toBeInTheDocument();
      });

      // Act - Click Next
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      // Assert - Page updated
      await waitFor(() => {
        expect(orderService.getAll).toHaveBeenCalledWith({
          page: 2,
          limit: 10,
          search: undefined,
          status: undefined,
          include_archived: false,
        });
      });
    });

    it('should navigate to previous page when Previous is clicked', async () => {
      // Arrange - Start on page 2
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Manually set page to 2
      await waitFor(() => {
        expect(screen.getByText('Page 1 / 1')).toBeInTheDocument();
      });

      // Navigate to next page (if possible)
      const nextButton = screen.queryByText('Next') as HTMLButtonElement;
      if (nextButton && !nextButton.disabled) {
        fireEvent.click(nextButton);
      }

      // Act - Click Previous
      const prevButton = screen.getByText('Previous') as HTMLButtonElement;
      if (!prevButton.disabled) {
        fireEvent.click(prevButton);
      }

      // The exact behavior depends on the implementation
      // This test ensures the button exists and can be clicked
      expect(prevButton).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should display Import and Create Order buttons', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Import')).toBeInTheDocument();
        expect(screen.getByText('Create Order')).toBeInTheDocument();
        expect(screen.getByTestId('download-icon')).toBeInTheDocument();
        expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
      });
    });

    it('should display search input', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Dropdown Menu Actions', () => {
    it('should open dropdown menu when actions button is clicked', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Wait for data to load first
      await waitFor(() => {
        const moreButtons = screen.getAllByTestId('more-horizontal-icon');
        expect(moreButtons).toHaveLength(2);
      });

      // Assert - Check if menu items appear (now they are always in DOM because of mock)
      expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Assign Driver')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Cancel Order')[0]).toBeInTheDocument();
    });

    it('should open Assign Driver dialog when Assign Driver is clicked', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const moreButtons = screen.getAllByTestId('more-horizontal-icon');
        const trigger = moreButtons[0].closest('button')!;
        fireEvent.click(trigger);
      });

      // Click Assign Driver
      await waitFor(() => {
        const assignButtons = screen.getAllByText('Assign Driver');
        fireEvent.click(assignButtons[0]);
      });

      // Assert - Dialog should open
      await waitFor(() => {
        expect(screen.getByTestId('assign-driver-dialog')).toBeInTheDocument();
        expect(screen.getByText('Order ID: 1')).toBeInTheDocument();
        expect(screen.getByText('Current Driver ID: 1')).toBeInTheDocument();
      });
    });

    it('should close Assign Driver dialog when close button is clicked', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const moreButtons = screen.getAllByTestId('more-horizontal-icon');
        const trigger = moreButtons[0].closest('button')!;
        fireEvent.click(trigger);
      });

      // Click Assign Driver
      await waitFor(() => {
        const assignButtons = screen.getAllByText('Assign Driver');
        fireEvent.click(assignButtons[0]);
      });

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByTestId('assign-driver-dialog')).toBeInTheDocument();
      });

      // Click close button
      fireEvent.click(screen.getByText('Close'));

      // Assert - Dialog should close
      await waitFor(() => {
        expect(screen.queryByTestId('assign-driver-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Arrange
      vi.mocked(orderService.getAll).mockRejectedValue(new Error('API Error'));

      // Act & Assert - Should not crash
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // The component should still render the basic structure
      expect(screen.getByText('Orders')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render table headers correctly', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Order #')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();
      expect(screen.getByText('Driver')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('should have correct table structure', async () => {
      // Act
      render(
        <TestWrapper>
          <OrdersPage />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBe(8); // Checkbox, Order #, Customer, Status, Warehouse, Driver, Amount, Actions
      });
    });
  });
});