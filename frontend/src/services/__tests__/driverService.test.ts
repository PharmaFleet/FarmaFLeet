import { describe, it, expect, vi, beforeEach } from 'vitest';
import { driverService } from '@/services/driverService';
import { api } from '@/lib/axios';
import { Driver, Order, PaginatedResponse, OrderStatus } from '@/types';

// Mock the axios instance
vi.mock('@/lib/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  handlePaginatedResponse: vi.fn((data) => data),
}));

describe('driverService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all drivers without parameters', async () => {
      // Arrange
      const mockResponse: PaginatedResponse<Driver> = {
        items: [
          {
            id: 1,
            user_id: 101,
            is_available: true,
            vehicle_info: 'Toyota Camry - KWT 1234',
            warehouse_id: 1,
          },
          {
            id: 2,
            user_id: 102,
            is_available: false,
            vehicle_info: 'Honda Civic - KWT 5678',
            warehouse_id: 1,
          },
        ],
        total: 2,
        page: 1,
        size: 10,
        pages: 1,
      };
      
      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await driverService.getAll();

      // Assert
      expect(api.get).toHaveBeenCalledWith('/drivers', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch drivers with filter parameters', async () => {
      // Arrange
      const params = { warehouse_id: '1', is_available: 'true' };
      const mockResponse: PaginatedResponse<Driver> = {
        items: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      };
      
      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await driverService.getAll(params);

      // Assert
      expect(api.get).toHaveBeenCalledWith('/drivers', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const error = new Error('Failed to fetch drivers');
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.getAll()).rejects.toThrow('Failed to fetch drivers');
    });

    it('should handle empty response', async () => {
      // Arrange
      const mockResponse: PaginatedResponse<Driver> = {
        items: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      };
      
      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      // Act
      const result = await driverService.getAll();

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getAllOnline', () => {
    it('should fetch all online drivers', async () => {
      // Arrange
      const mockDrivers: Driver[] = [
        {
          id: 1,
          user_id: 101,
          is_available: true,
          vehicle_info: 'Toyota Camry - KWT 1234',
          warehouse_id: 1,
        },
        {
          id: 3,
          user_id: 103,
          is_available: true,
          vehicle_info: 'Nissan Altima - KWT 9999',
          warehouse_id: 2,
        },
      ];
      
      vi.mocked(api.get).mockResolvedValue({ data: mockDrivers });

      // Act
      const result = await driverService.getAllOnline();

      // Assert
      expect(api.get).toHaveBeenCalledWith('/drivers', { params: { active_only: true, size: 100 } });
      expect(result).toEqual(mockDrivers);
    });

    it('should handle paginated response format', async () => {
      // Arrange
      const paginatedData = {
        items: [
          {
            id: 1,
            user_id: 101,
            is_available: true,
            vehicle_info: 'Toyota Camry - KWT 1234',
            warehouse_id: 1,
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        pages: 1,
      };
      
      vi.mocked(api.get).mockResolvedValue({ data: paginatedData });

      // Act
      const result = await driverService.getAllOnline();

      // Assert
      expect(result).toEqual(paginatedData.items);
    });

    it('should handle empty array response', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({ data: [] });

      // Act
      const result = await driverService.getAllOnline();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      // Arrange
      const error = new Error('Network error');
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.getAllOnline()).rejects.toThrow('Network error');
    });
  });

  describe('getById', () => {
    it('should fetch a single driver by ID', async () => {
      // Arrange
      const driverId = 1;
      const mockDriver: Driver = {
        id: driverId,
        user_id: 101,
        is_available: true,
        vehicle_info: 'Toyota Camry - KWT 1234',
        biometric_id: 'BIO001',
        warehouse_id: 1,
      };
      
      vi.mocked(api.get).mockResolvedValue({ data: mockDriver });

      // Act
      const result = await driverService.getById(driverId);

      // Assert
      expect(api.get).toHaveBeenCalledWith(`/drivers/${driverId}`);
      expect(result).toEqual(mockDriver);
    });

    it('should handle driver not found', async () => {
      // Arrange
      const driverId = 999;
      const error = new Error('Driver not found');
      (error as any).response = { status: 404 };
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.getById(driverId)).rejects.toThrow('Driver not found');
    });

    it('should handle invalid driver ID', async () => {
      // Arrange
      const driverId = -1;
      const error = new Error('Invalid driver ID');
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.getById(driverId)).rejects.toThrow('Invalid driver ID');
    });
  });

  describe('getDriverOrders', () => {
    const mockOrdersResponse: PaginatedResponse<Order> = {
      items: [
        {
          id: 101,
          sales_order_number: 'SO-101',
          customer_info: { name: 'Alice', phone: '+96511111111', address: '10 Block A' },
          payment_method: 'cash',
          total_amount: 12.500,
          warehouse_id: 1,
          driver_id: 1,
          status: OrderStatus.DELIVERED,
          created_at: '2026-02-01T08:00:00Z',
          updated_at: '2026-02-01T10:00:00Z',
        },
        {
          id: 102,
          sales_order_number: 'SO-102',
          customer_info: { name: 'Bob', phone: '+96522222222', address: '20 Block B' },
          payment_method: 'card',
          total_amount: 8.750,
          warehouse_id: 1,
          driver_id: 1,
          status: OrderStatus.ASSIGNED,
          created_at: '2026-02-02T09:00:00Z',
          updated_at: '2026-02-02T09:00:00Z',
        },
      ],
      total: 25,
      page: 1,
      size: 10,
      pages: 3,
    };

    it('should fetch driver orders with default params', async () => {
      // Arrange
      const driverId = 1;
      vi.mocked(api.get).mockResolvedValue({ data: mockOrdersResponse });

      // Act
      const result = await driverService.getDriverOrders(driverId);

      // Assert
      expect(api.get).toHaveBeenCalledWith(`/drivers/${driverId}/orders`, { params: undefined });
      expect(result).toEqual(mockOrdersResponse);
    });

    it('should fetch driver orders with pagination params', async () => {
      // Arrange
      const driverId = 1;
      const params = { page: 2, size: 10 };
      vi.mocked(api.get).mockResolvedValue({ data: mockOrdersResponse });

      // Act
      const result = await driverService.getDriverOrders(driverId, params);

      // Assert
      expect(api.get).toHaveBeenCalledWith(`/drivers/${driverId}/orders`, { params });
      expect(result).toEqual(mockOrdersResponse);
    });

    it('should fetch driver orders with status filter', async () => {
      // Arrange
      const driverId = 1;
      const params = { page: 1, size: 10, status_filter: 'delivered' };
      vi.mocked(api.get).mockResolvedValue({ data: mockOrdersResponse });

      // Act
      const result = await driverService.getDriverOrders(driverId, params);

      // Assert
      expect(api.get).toHaveBeenCalledWith(`/drivers/${driverId}/orders`, { params });
    });

    it('should return correct pagination metadata', async () => {
      // Arrange
      const driverId = 1;
      vi.mocked(api.get).mockResolvedValue({ data: mockOrdersResponse });

      // Act
      const result = await driverService.getDriverOrders(driverId, { page: 1, size: 10 });

      // Assert
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.size).toBe(10);
      expect(result.pages).toBe(3);
      expect(result.items).toHaveLength(2);
    });

    it('should handle empty orders list', async () => {
      // Arrange
      const driverId = 99;
      const emptyResponse: PaginatedResponse<Order> = {
        items: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      };
      vi.mocked(api.get).mockResolvedValue({ data: emptyResponse });

      // Act
      const result = await driverService.getDriverOrders(driverId, { page: 1, size: 10 });

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });

    it('should handle API errors', async () => {
      // Arrange
      const driverId = 1;
      const error = new Error('Failed to fetch driver orders');
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.getDriverOrders(driverId, { page: 1, size: 10 }))
        .rejects.toThrow('Failed to fetch driver orders');
    });

    it('should handle driver not found', async () => {
      // Arrange
      const driverId = 999;
      const error = new Error('Driver not found');
      (error as any).response = { status: 404 };
      vi.mocked(api.get).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.getDriverOrders(driverId))
        .rejects.toThrow('Driver not found');
    });

    it('should handle network timeout', async () => {
      // Arrange
      const driverId = 1;
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      vi.mocked(api.get).mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(driverService.getDriverOrders(driverId, { page: 1, size: 10 }))
        .rejects.toThrow('Request timeout');
    });

    it('should handle last page correctly', async () => {
      // Arrange
      const driverId = 1;
      const lastPageResponse: PaginatedResponse<Order> = {
        items: [
          {
            id: 125,
            sales_order_number: 'SO-125',
            customer_info: { name: 'Zara', phone: '+96599999999', address: '99 Last St' },
            payment_method: 'cash',
            total_amount: 5.000,
            warehouse_id: 1,
            driver_id: 1,
            status: OrderStatus.PENDING,
            created_at: '2026-02-05T10:00:00Z',
            updated_at: '2026-02-05T10:00:00Z',
          },
        ],
        total: 25,
        page: 3,
        size: 10,
        pages: 3,
      };
      vi.mocked(api.get).mockResolvedValue({ data: lastPageResponse });

      // Act
      const result = await driverService.getDriverOrders(driverId, { page: 3, size: 10 });

      // Assert
      expect(result.page).toBe(3);
      expect(result.pages).toBe(3);
      expect(result.items).toHaveLength(1);
    });

    it('should pass correct URL with driver ID', async () => {
      // Arrange
      const driverId = 42;
      vi.mocked(api.get).mockResolvedValue({ data: { items: [], total: 0, page: 1, size: 10, pages: 0 } });

      // Act
      await driverService.getDriverOrders(driverId);

      // Assert
      expect(api.get).toHaveBeenCalledWith('/drivers/42/orders', { params: undefined });
    });
  });

  describe('create', () => {
    it('should create a new driver', async () => {
      // Arrange
      const newDriver = {
        user_id: 104,
        is_available: true,
        vehicle_info: 'BMW X5 - KWT 7777',
        biometric_id: 'BIO004',
        warehouse_id: 1,
      };
      
      const mockCreatedDriver: Driver = {
        id: 4,
        ...newDriver,
      };
      
      vi.mocked(api.post).mockResolvedValue({ data: mockCreatedDriver });

      // Act
      const result = await driverService.create(newDriver);

      // Assert
      expect(api.post).toHaveBeenCalledWith('/drivers', newDriver);
      expect(result).toEqual(mockCreatedDriver);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidDriver = { user_id: null };
      const error = new Error('Validation failed: user_id is required');
      (error as any).response = { 
        status: 400, 
        data: { detail: 'user_id is required' } 
      };
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.create(invalidDriver)).rejects.toThrow('Validation failed: user_id is required');
    });

    it('should handle duplicate user_id', async () => {
      // Arrange
      const duplicateDriver = {
        user_id: 101, // Already exists
        is_available: true,
        vehicle_info: 'Test Car - KWT 0000',
        warehouse_id: 1,
      };
      
      const error = new Error('User already registered as driver');
      (error as any).response = { 
        status: 409, 
        data: { detail: 'User already registered as driver' } 
      };
      vi.mocked(api.post).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.create(duplicateDriver)).rejects.toThrow('User already registered as driver');
    });
  });

  describe('update', () => {
    it('should update driver information', async () => {
      // Arrange
      const driverId = 1;
      const updateData = {
        vehicle_info: 'Updated Car - KWT 1111',
        is_available: false,
      };
      
      const mockUpdatedDriver: Driver = {
        id: driverId,
        user_id: 101,
        is_available: false,
        vehicle_info: 'Updated Car - KWT 1111',
        warehouse_id: 1,
      };
      
      vi.mocked(api.put).mockResolvedValue({ data: mockUpdatedDriver });

      // Act
      const result = await driverService.update(driverId, updateData);

      // Assert
      expect(api.put).toHaveBeenCalledWith(`/drivers/${driverId}`, updateData);
      expect(result).toEqual(mockUpdatedDriver);
    });

    it('should handle driver not found during update', async () => {
      // Arrange
      const driverId = 999;
      const updateData = { vehicle_info: 'New Car' };
      const error = new Error('Driver not found');
      (error as any).response = { status: 404 };
      vi.mocked(api.put).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.update(driverId, updateData)).rejects.toThrow('Driver not found');
    });

    it('should handle partial updates', async () => {
      // Arrange
      const driverId = 1;
      const partialUpdate = { biometric_id: 'BIO999' };
      
      const mockUpdatedDriver: Driver = {
        id: driverId,
        user_id: 101,
        is_available: true,
        vehicle_info: 'Toyota Camry - KWT 1234',
        biometric_id: 'BIO999',
        warehouse_id: 1,
      };
      
      vi.mocked(api.put).mockResolvedValue({ data: mockUpdatedDriver });

      // Act
      const result = await driverService.update(driverId, partialUpdate);

      // Assert
      expect(api.put).toHaveBeenCalledWith(`/drivers/${driverId}`, partialUpdate);
      expect(result.biometric_id).toBe('BIO999');
    });
  });

  describe('updateStatus', () => {
    it('should update driver availability status', async () => {
      // Arrange
      const driverId = 1;
      const isAvailable = false;
      
      const mockUpdatedDriver: Driver = {
        id: driverId,
        user_id: 101,
        is_available: false,
        vehicle_info: 'Toyota Camry - KWT 1234',
        warehouse_id: 1,
      };
      
      vi.mocked(api.patch).mockResolvedValue({ data: mockUpdatedDriver });

      // Act
      const result = await driverService.updateStatus(driverId, isAvailable);

      // Assert
      expect(api.patch).toHaveBeenCalledWith(`/drivers/${driverId}/status`, { is_available: isAvailable });
      expect(result.is_available).toBe(false);
    });

    it('should set driver as available', async () => {
      // Arrange
      const driverId = 2;
      const isAvailable = true;
      
      const mockUpdatedDriver: Driver = {
        id: driverId,
        user_id: 102,
        is_available: true,
        vehicle_info: 'Honda Civic - KWT 5678',
        warehouse_id: 1,
      };
      
      vi.mocked(api.patch).mockResolvedValue({ data: mockUpdatedDriver });

      // Act
      const result = await driverService.updateStatus(driverId, isAvailable);

      // Assert
      expect(api.patch).toHaveBeenCalledWith(`/drivers/${driverId}/status`, { is_available: true });
      expect(result.is_available).toBe(true);
    });

    it('should handle driver not found during status update', async () => {
      // Arrange
      const driverId = 999;
      const error = new Error('Driver not found');
      (error as any).response = { status: 404 };
      vi.mocked(api.patch).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.updateStatus(driverId, true)).rejects.toThrow('Driver not found');
    });

    it('should handle invalid status value', async () => {
      // Arrange
      const driverId = 1;
      const error = new Error('Invalid status value');
      vi.mocked(api.patch).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.updateStatus(driverId, null as any)).rejects.toThrow('Invalid status value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null parameters gracefully', async () => {
      // Arrange
      vi.mocked(api.get).mockRejectedValue(new Error('Invalid parameters'));

      // Act & Assert
      await expect(driverService.getAll(null as any)).rejects.toThrow('Invalid parameters');
    });

    it('should handle network timeout', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      vi.mocked(api.get).mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(driverService.getAll()).rejects.toThrow('Request timeout');
    });

    it('should handle server error responses', async () => {
      // Arrange
      const serverError = new Error('Internal Server Error');
      (serverError as any).response = { 
        status: 500, 
        data: { detail: 'Internal server error' } 
      };
      vi.mocked(api.get).mockRejectedValue(serverError);

      // Act & Assert
      await expect(driverService.getAll()).rejects.toThrow('Internal Server Error');
    });

    it('should handle concurrent requests', async () => {
      // Arrange
      const mockResponse: PaginatedResponse<Driver> = {
        items: [
          {
            id: 1,
            user_id: 101,
            is_available: true,
            vehicle_info: 'Toyota Camry - KWT 1234',
            warehouse_id: 1,
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        pages: 1,
      };
      
      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      // Act
      const [result1, result2] = await Promise.all([
        driverService.getAll(),
        driverService.getAll(),
      ]);

      // Assert
      expect(result1).toEqual(mockResponse);
      expect(result2).toEqual(mockResponse);
      expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('should handle empty update data', async () => {
      // Arrange
      const driverId = 1;
      const emptyUpdate = {};
      const error = new Error('No data provided for update');
      vi.mocked(api.put).mockRejectedValue(error);

      // Act & Assert
      await expect(driverService.update(driverId, emptyUpdate)).rejects.toThrow('No data provided for update');
    });
  });
});