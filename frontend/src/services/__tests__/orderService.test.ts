import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderService } from '@/services/orderService';
import { api } from '@/lib/axios';
import { Order, PaginatedResponse } from '@/types';

// Mock the axios instance
vi.mock('@/lib/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  handlePaginatedResponse: vi.fn((data) => data),
}));

describe('orderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all orders without parameters', async () => {
      // Arrange
      const mockResponse: PaginatedResponse<Order> = {
        items: [
          {
            id: 1,
            sales_order_number: 'SO-001',
            customer_info: { name: 'John Doe', phone: '+96512345678', address: 'Test Address' },
            payment_method: 'cash',
            total_amount: 15.5,
            warehouse_id: 1,
            status: 'PENDING',
            created_at: '2026-01-22T10:00:00Z',
            updated_at: '2026-01-22T10:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        pages: 1,
      };
      
      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await orderService.getAll();

      // Assert
      expect(api.get).toHaveBeenCalledWith('/orders', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch orders with filter parameters', async () => {
      // Arrange
      const params = { status: 'PENDING', warehouse_id: '1' };
      const mockResponse: PaginatedResponse<Order> = {
        items: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      };
      
      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await orderService.getAll(params);

      // Assert
      expect(api.get).toHaveBeenCalledWith('/orders', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const error = new Error('Network error');
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(orderService.getAll()).rejects.toThrow('Network error');
    });
  });

  describe('getById', () => {
    it('should fetch a single order by ID', async () => {
      // Arrange
      const orderId = 1;
      const mockOrder: Order = {
        id: orderId,
        sales_order_number: 'SO-001',
        customer_info: { name: 'John Doe', phone: '+96512345678', address: 'Test Address' },
        payment_method: 'cash',
        total_amount: 15.5,
        warehouse_id: 1,
        status: 'PENDING',
        created_at: '2026-01-22T10:00:00Z',
        updated_at: '2026-01-22T10:00:00Z',
      };
      
      vi.mocked(api.get).mockResolvedValue({ data: mockOrder });

      // Act
      const result = await orderService.getById(orderId);

      // Assert
      expect(api.get).toHaveBeenCalledWith(`/orders/${orderId}`);
      expect(result).toEqual(mockOrder);
    });

    it('should handle not found error', async () => {
      // Arrange
      const orderId = 999;
      const error = new Error('Order not found');
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(orderService.getById(orderId)).rejects.toThrow('Order not found');
    });
  });

  describe('create', () => {
    it('should create a new order', async () => {
      // Arrange
      const newOrder = {
        sales_order_number: 'SO-002',
        customer_info: { name: 'Jane Doe', phone: '+96587654321', address: 'Test Address 2' },
        payment_method: 'card',
        total_amount: 25.75,
        warehouse_id: 2,
      };
      
      const mockCreatedOrder: Order = {
        id: 2,
        ...newOrder,
        status: 'PENDING',
        created_at: '2026-01-22T11:00:00Z',
        updated_at: '2026-01-22T11:00:00Z',
      };
      
      vi.mocked(api.post).mockResolvedValue({ data: mockCreatedOrder });

      // Act
      const result = await orderService.create(newOrder);

      // Assert
      expect(api.post).toHaveBeenCalledWith('/orders', newOrder);
      expect(result).toEqual(mockCreatedOrder);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidOrder = { sales_order_number: '' };
      const error = new Error('Validation failed');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(orderService.create(invalidOrder)).rejects.toThrow('Validation failed');
    });
  });

  describe('assignDriver', () => {
    it('should assign a driver to an order', async () => {
      // Arrange
      const orderId = 1;
      const driverId = 5;
      const mockResponse = { success: true, message: 'Driver assigned successfully' };
      
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await orderService.assignDriver(orderId, driverId);

      // Assert
      expect(api.post).toHaveBeenCalledWith(`/orders/${orderId}/assign`, { driver_id: driverId });
      expect(result).toEqual(mockResponse);
    });

    it('should handle driver not found error', async () => {
      // Arrange
      const orderId = 1;
      const driverId = 999;
      const error = new Error('Driver not found');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(orderService.assignDriver(orderId, driverId)).rejects.toThrow('Driver not found');
    });

    it('should handle order not found error', async () => {
      // Arrange
      const orderId = 999;
      const driverId = 1;
      const error = new Error('Order not found');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(orderService.assignDriver(orderId, driverId)).rejects.toThrow('Order not found');
    });
  });

  describe('unassignDriver', () => {
    it('should unassign a driver from an order', async () => {
      // Arrange
      const orderId = 1;
      const mockResponse = { success: true, message: 'Driver unassigned successfully' };
      
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await orderService.unassignDriver(orderId);

      // Assert
      expect(api.post).toHaveBeenCalledWith(`/orders/${orderId}/unassign`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('batchAssign', () => {
    it('should assign multiple orders to drivers', async () => {
      // Arrange
      const assignments = [
        { order_id: 1, driver_id: 5 },
        { order_id: 2, driver_id: 5 },
        { order_id: 3, driver_id: 6 },
      ];
      const mockResponse = { 
        success: true, 
        assigned: 3,
        failed: 0,
        message: '3 orders assigned successfully' 
      };
      
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await orderService.batchAssign(assignments);

      // Assert
      expect(api.post).toHaveBeenCalledWith('/orders/batch-assign', assignments);
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty assignments array', async () => {
      // Arrange
      const assignments: { order_id: number, driver_id: number }[] = [];
      const error = new Error('No assignments provided');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(orderService.batchAssign(assignments)).rejects.toThrow('No assignments provided');
    });

    it('should handle partial failures in batch assignment', async () => {
      // Arrange
      const assignments = [
        { order_id: 1, driver_id: 5 },
        { order_id: 2, driver_id: 999 }, // Invalid driver
      ];
      const mockResponse = { 
        success: false,
        assigned: 1,
        failed: 1,
        errors: [{ order_id: 2, error: 'Driver not found' }]
      };
      
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await orderService.batchAssign(assignments);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.failed).toBe(1);
    });
  });

  describe('importExcel', () => {
    it('should import orders from Excel file', async () => {
      // Arrange
      const file = new File(['dummy content'], 'orders.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const mockResponse = {
        success: true,
        imported: 50,
        failed: 0,
        duplicates: 2,
        message: 'Import completed successfully'
      };
      
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await orderService.importExcel(file);

      // Assert
      expect(api.post).toHaveBeenCalledWith(
        '/orders/import',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      // Verify FormData contains the file
      const formDataCall = vi.mocked(api.post).mock.calls[0];
      const formData = formDataCall[1] as FormData;
      expect(formData.get('file')).toBe(file);
      
      expect(result).toEqual(mockResponse);
    });

    it('should handle file upload errors', async () => {
      // Arrange
      const file = new File([''], 'orders.xlsx');
      const error = new Error('File upload failed');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(orderService.importExcel(file)).rejects.toThrow('File upload failed');
    });

    it('should reject non-Excel files', async () => {
      // Arrange
      const file = new File([''], 'orders.txt', { type: 'text/plain' });
      const error = new Error('Invalid file type');
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(orderService.importExcel(file)).rejects.toThrow('Invalid file type');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null parameters gracefully', async () => {
      // Arrange
      vi.mocked(api.get).mockRejectedValue(new Error('Invalid parameters'));

      // Act & Assert
      await expect(orderService.getAll(null as any)).rejects.toThrow('Invalid parameters');
    });

    it('should handle network timeout', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      vi.mocked(api.get).mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(orderService.getAll()).rejects.toThrow('Request timeout');
    });

    it('should handle server error responses', async () => {
      // Arrange
      const serverError = new Error('Internal Server Error');
      (serverError as any).response = { status: 500, data: { message: 'Server error' } };
      vi.mocked(api.get).mockRejectedValue(serverError);

      // Act & Assert
      await expect(orderService.getAll()).rejects.toThrow('Internal Server Error');
    });
  });
});