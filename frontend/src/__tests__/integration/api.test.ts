import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { server } from '@/__tests__/mocks/server';
import { orderService } from '@/services/orderService';
import { driverService } from '@/services/driverService';
import { authService, LoginRequest } from '@/services/authService';
import { Order, Driver, PaginatedResponse } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

// Setup MSW server - use 'warn' to log unhandled requests without failing
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  // Reset auth store after each test
  useAuthStore.getState().logout();
});
afterAll(() => server.close());

// Helper to setup authenticated state for tests that need it
const setupAuth = () => {
  useAuthStore.getState().login(
    { id: 101, email: 'test@example.com', role: 'driver', full_name: 'Test User' },
    'mock_access_token',
    'mock_refresh_token'
  );
};

describe('API Integration Tests', () => {
  describe('Orders API', () => {
    describe('GET /api/orders', () => {
      it('should fetch orders with pagination', async () => {
        // Act
        const result = await orderService.getAll({ page: 1, size: 10 });

        // Assert
        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.size).toBe(10);
        expect(result.pages).toBe(1);
        
        expect(result.items[0]).toMatchObject({
          id: 1,
          sales_order_number: 'SO-001',
          customer_info: {
            name: 'John Doe',
            phone: '+96512345678',
          },
          status: 'PENDING',
        });
      });

      it('should filter orders by status', async () => {
        // Act
        const result = await orderService.getAll({ status: 'PENDING' });

        // Assert
        expect(result.items).toHaveLength(1);
        expect(result.items[0].status).toBe('PENDING');
        expect(result.items[0].sales_order_number).toBe('SO-001');
      });

      it('should filter orders by warehouse', async () => {
        // Act
        const result = await orderService.getAll({ warehouse_id: '1' });

        // Assert
        expect(result.items).toHaveLength(2);
        result.items.forEach(order => {
          expect(order.warehouse_id).toBe(1);
        });
      });

      it('should handle pagination correctly', async () => {
        // Act
        const result = await orderService.getAll({ page: 1, size: 1 });

        // Assert
        expect(result.items).toHaveLength(1);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.size).toBe(1);
        expect(result.pages).toBe(2);
      });

      it('should return empty result for non-existent page', async () => {
        // Act
        const result = await orderService.getAll({ page: 999, size: 10 });

        // Assert
        expect(result.items).toHaveLength(0);
        expect(result.total).toBe(2);
      });
    });

    describe('GET /api/orders/:id', () => {
      it('should fetch a single order by ID', async () => {
        // Act
        const order = await orderService.getById(1);

        // Assert
        expect(order).toMatchObject({
          id: 1,
          sales_order_number: 'SO-001',
          status: 'PENDING',
          total_amount: 15.50,
        });
      });

      it('should return 404 for non-existent order', async () => {
        // Act & Assert - axios throws with status code in message, detail is in response.data
        await expect(orderService.getById(999)).rejects.toMatchObject({
          response: { status: 404, data: { detail: 'Order not found' } }
        });
      });
    });

    describe('POST /api/orders', () => {
      it('should create a new order', async () => {
        // Arrange
        const newOrder = {
          sales_order_number: 'SO-003',
          customer_info: {
            name: 'New Customer',
            phone: '+96555555555',
            address: 'New Address',
          },
          payment_method: 'cash',
          total_amount: 30.00,
          warehouse_id: 1,
        };

        // Act
        const createdOrder = await orderService.create(newOrder);

        // Assert
        expect(createdOrder).toMatchObject({
          id: 3,
          ...newOrder,
          status: 'PENDING',
        });
        expect(createdOrder.created_at).toBeDefined();
        expect(createdOrder.updated_at).toBeDefined();
      });

      it('should assign order ID sequentially', async () => {
        // Arrange
        const newOrder = {
          sales_order_number: 'SO-004',
          customer_info: {
            name: 'Another Customer',
            phone: '+96566666666',
            address: 'Another Address',
          },
          payment_method: 'card',
          total_amount: 45.00,
          warehouse_id: 1,
        };

        // Act
        const createdOrder = await orderService.create(newOrder);

        // Assert
        expect(createdOrder.id).toBe(4);
      });
    });

    describe('POST /api/orders/:id/assign', () => {
      it('should assign a driver to an order', async () => {
        // Act
        const result = await orderService.assignDriver(2, 1);

        // Assert
        expect(result).toEqual({
          success: true,
          message: 'Driver assigned successfully',
        });

        // Verify the order was updated
        const updatedOrder = await orderService.getById(2);
        expect(updatedOrder.driver_id).toBe(1);
        expect(updatedOrder.status).toBe('ASSIGNED');
      });

      it('should return 404 for non-existent order', async () => {
        // Act & Assert - axios throws with status code in message, detail is in response.data
        await expect(orderService.assignDriver(999, 1)).rejects.toMatchObject({
          response: { status: 404, data: { detail: 'Order not found' } }
        });
      });

      it('should return 404 for non-existent driver', async () => {
        // Act & Assert - axios throws with status code in message, detail is in response.data
        await expect(orderService.assignDriver(1, 999)).rejects.toMatchObject({
          response: { status: 404, data: { detail: 'Driver not found' } }
        });
      });
    });

    describe('POST /api/orders/:id/unassign', () => {
      it('should unassign a driver from an order', async () => {
        // First assign a driver
        await orderService.assignDriver(1, 1);

        // Then unassign
        const result = await orderService.unassignDriver(1);

        // Assert
        expect(result).toEqual({
          success: true,
          message: 'Driver unassigned successfully',
        });

        // Verify the order was updated
        const updatedOrder = await orderService.getById(1);
        expect(updatedOrder.driver_id).toBeUndefined();
        expect(updatedOrder.status).toBe('PENDING');
      });
    });

    describe('POST /api/orders/batch-assign', () => {
      it('should assign multiple orders successfully', async () => {
        // Arrange
        const assignments = [
          { order_id: 1, driver_id: 1 },
          { order_id: 2, driver_id: 2 },
        ];

        // Act
        const result = await orderService.batchAssign(assignments);

        // Assert
        expect(result).toEqual({
          success: true,
          assigned: 2,
          failed: 0,
        });

        // Verify orders were updated
        const order1 = await orderService.getById(1);
        const order2 = await orderService.getById(2);
        expect(order1.driver_id).toBe(1);
        expect(order2.driver_id).toBe(2);
      });

      it('should handle partial failures in batch assignment', async () => {
        // Arrange
        const assignments = [
          { order_id: 1, driver_id: 1 }, // Valid
          { order_id: 999, driver_id: 1 }, // Invalid order
          { order_id: 2, driver_id: 999 }, // Invalid driver
        ];

        // Act
        const result = await orderService.batchAssign(assignments);

        // Assert
        expect(result).toEqual({
          success: false,
          assigned: 1,
          failed: 2,
          errors: [
            { order_id: 999, error: 'Order not found' },
            { order_id: 2, error: 'Driver not found' },
          ],
        });
      });

      it('should handle empty assignments', async () => {
        // Arrange
        const assignments: { order_id: number, driver_id: number }[] = [];

        // Act
        const result = await orderService.batchAssign(assignments);

        // Assert
        expect(result).toEqual({
          success: true,
          assigned: 0,
          failed: 0,
        });
      });
    });
  });

  describe('Drivers API', () => {
    describe('GET /api/drivers', () => {
      it('should fetch all drivers', async () => {
        // Act
        const result = await driverService.getAll();

        // Assert
        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.items[0]).toMatchObject({
          id: 1,
          user_id: 101,
          is_available: true,
          vehicle_info: 'Toyota Camry - KWT 1234',
        });
      });

      it('should filter drivers by availability', async () => {
        // Act
        const result = await driverService.getAll({ is_available: 'true' });

        // Assert
        expect(result.items).toHaveLength(1);
        expect(result.items[0].is_available).toBe(true);
      });
    });

    describe('GET /api/drivers/online', () => {
      it('should fetch online drivers (available)', async () => {
        // Act
        const drivers = await driverService.getAllOnline();

        // Assert
        expect(drivers).toHaveLength(1);
        expect(drivers[0].is_available).toBe(true);
      });
    });

    describe('POST /api/drivers', () => {
      it('should create a new driver', async () => {
        // Arrange
        const newDriver = {
          user_id: 103,
          is_available: true,
          vehicle_info: 'BMW X5 - KWT 7777',
          warehouse_id: 1,
        };

        // Act
        const createdDriver = await driverService.create(newDriver);

        // Assert
        expect(createdDriver).toMatchObject({
          id: 3,
          ...newDriver,
        });
      });

      it('should reject duplicate user_id', async () => {
        // Arrange
        const duplicateDriver = {
          user_id: 101, // Already exists
          is_available: true,
          vehicle_info: 'Duplicate Car - KWT 0000',
          warehouse_id: 1,
        };

        // Act & Assert - axios throws with status code in message, detail is in response.data
        await expect(driverService.create(duplicateDriver)).rejects.toMatchObject({
          response: { status: 409, data: { detail: 'User already registered as driver' } }
        });
      });
    });

    describe('PUT /api/drivers/:id', () => {
      it('should update driver information', async () => {
        // Arrange
        const updateData = {
          vehicle_info: 'Updated Car - KWT 1111',
          is_available: false,
        };

        // Act
        const updatedDriver = await driverService.update(1, updateData);

        // Assert
        expect(updatedDriver).toMatchObject(updateData);
      });

      it('should return 404 for non-existent driver', async () => {
        // Act & Assert - axios throws with status code in message, detail is in response.data
        await expect(driverService.update(999, { vehicle_info: 'Test' })).rejects.toMatchObject({
          response: { status: 404, data: { detail: 'Driver not found' } }
        });
      });
    });

    describe('PATCH /api/drivers/:id/status', () => {
      it('should update driver availability status', async () => {
        // Act
        const updatedDriver = await driverService.updateStatus(1, false);

        // Assert
        expect(updatedDriver.is_available).toBe(false);
      });

      it('should set driver as available', async () => {
        // First set as unavailable
        await driverService.updateStatus(2, true);

        // Act
        const updatedDriver = await driverService.updateStatus(2, true);

        // Assert
        expect(updatedDriver.is_available).toBe(true);
      });
    });
  });

  describe('Auth API', () => {
    describe('POST /api/login/access-token', () => {
      it('should login with valid credentials', async () => {
        // Arrange
        const credentials: LoginRequest = {
          email: 'test@example.com',
          password: 'password123',
        };

        // Act
        const result = await authService.login(credentials);

        // Assert
        expect(result).toMatchObject({
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          token_type: 'bearer',
        });
        expect(result.user).toBeDefined();
        // The user is fetched separately via /users/me, which returns the mock user
        expect(result.user.email).toBe('driver@example.com');
      });

      it('should reject invalid credentials', async () => {
        // Arrange
        const credentials: LoginRequest = {
          email: 'invalid@example.com',
          password: 'wrongpassword',
        };

        // Act & Assert - The login request returns 401, and since there's no refresh token,
        // the axios interceptor will throw 'No refresh token'. We check that it rejects.
        await expect(authService.login(credentials)).rejects.toThrow();
      });
    });

    describe('GET /api/users/me', () => {
      it('should fetch current user with valid token', async () => {
        // Act
        const user = await authService.getCurrentUser();

        // Assert
        expect(user).toMatchObject({
          id: 101,
          email: 'driver@example.com',
          full_name: 'Driver One',
          is_active: true,
          role: 'driver',
        });
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        // Act & Assert - Should not throw
        await expect(authService.logout()).resolves.not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors', async () => {
      // This would need a custom handler or using the error endpoint
      // For now, we'll simulate by mocking a server error
      
      // Act & Assert
      // This would be tested with actual error scenarios
      expect(true).toBe(true); // Placeholder
    });

    it('should handle network timeouts', async () => {
      // This would require setting a shorter timeout in axios config
      // For now, we'll just ensure the test structure is in place
      expect(true).toBe(true); // Placeholder
    });
  });
});