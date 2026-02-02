import { http, HttpResponse, delay } from 'msw';
import { Order, Driver, User, PaginatedResponse } from '@/types';

// Mock data
const mockOrders: Order[] = [
  {
    id: 1,
    sales_order_number: 'SO-001',
    customer_info: {
      name: 'John Doe',
      phone: '+96512345678',
      address: '123 Main St, Kuwait City',
    },
    payment_method: 'cash',
    total_amount: 15.50,
    warehouse_id: 1,
    driver_id: 1,
    status: 'PENDING',
    created_at: '2026-01-22T10:00:00Z',
    updated_at: '2026-01-22T10:00:00Z',
  },
  {
    id: 2,
    sales_order_number: 'SO-002',
    customer_info: {
      name: 'Jane Smith',
      phone: '+96587654321',
      address: '456 Gulf Rd, Salmiya',
    },
    payment_method: 'card',
    total_amount: 25.75,
    warehouse_id: 1,
    driver_id: null,
    status: 'ASSIGNED',
    created_at: '2026-01-22T09:30:00Z',
    updated_at: '2026-01-22T11:00:00Z',
  },
];

const mockDrivers: Driver[] = [
  {
    id: 1,
    user_id: 101,
    is_available: true,
    vehicle_info: 'Toyota Camry - KWT 1234',
    biometric_id: 'BIO001',
    warehouse_id: 1,
  },
  {
    id: 2,
    user_id: 102,
    is_available: false,
    vehicle_info: 'Honda Civic - KWT 5678',
    warehouse_id: 1,
  },
];

const mockUser: User = {
  id: 101,
  email: 'driver@example.com',
  full_name: 'Driver One',
  is_active: true,
  role: 'driver',
  warehouse_id: 1,
};

// API handlers - use wildcard to match both relative and absolute URLs
// The axios client uses http://localhost:8000/api/v1 as base URL
const API_BASE = '*/api/v1';

export const handlers = [
  // Orders endpoints
  http.get(`${API_BASE}/orders`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const size = Number(url.searchParams.get('size') || '10');
    const status = url.searchParams.get('status');
    const warehouseId = url.searchParams.get('warehouse_id');

    let filteredOrders = mockOrders;

    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }

    if (warehouseId) {
      filteredOrders = filteredOrders.filter(order => order.warehouse_id === Number(warehouseId));
    }

    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedItems = filteredOrders.slice(startIndex, endIndex);

    const response: PaginatedResponse<Order> = {
      items: paginatedItems,
      total: filteredOrders.length,
      page,
      size,
      pages: Math.ceil(filteredOrders.length / size),
    };

    return HttpResponse.json(response);
  }),

  http.get(`${API_BASE}/orders/:id`, ({ params }) => {
    const { id } = params;
    const order = mockOrders.find(o => o.id === Number(id));

    if (!order) {
      return HttpResponse.json({ detail: 'Order not found' }, { status: 404 });
    }

    return HttpResponse.json(order);
  }),

  http.post(`${API_BASE}/orders`, async ({ request }) => {
    const newOrder = await request.json() as any;

    const createdOrder: Order = {
      id: mockOrders.length + 1,
      ...newOrder,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockOrders.push(createdOrder);

    return HttpResponse.json(createdOrder, { status: 201 });
  }),

  http.post(`${API_BASE}/orders/:id/assign`, async ({ request, params }) => {
    const { id } = params;
    const { driver_id } = await request.json() as { driver_id: number };

    const order = mockOrders.find(o => o.id === Number(id));

    if (!order) {
      return HttpResponse.json({ detail: 'Order not found' }, { status: 404 });
    }

    const driver = mockDrivers.find(d => d.id === driver_id);

    if (!driver) {
      return HttpResponse.json({ detail: 'Driver not found' }, { status: 404 });
    }

    order.driver_id = driver_id;
    order.status = 'ASSIGNED';
    order.updated_at = new Date().toISOString();

    return HttpResponse.json({
      success: true,
      message: 'Driver assigned successfully'
    });
  }),

  http.post(`${API_BASE}/orders/:id/unassign`, ({ params }) => {
    const { id } = params;
    const order = mockOrders.find(o => o.id === Number(id));

    if (!order) {
      return HttpResponse.json({ detail: 'Order not found' }, { status: 404 });
    }

    order.driver_id = undefined;
    order.status = 'PENDING';
    order.updated_at = new Date().toISOString();

    return HttpResponse.json({
      success: true,
      message: 'Driver unassigned successfully'
    });
  }),

  http.post(`${API_BASE}/orders/batch-assign`, async ({ request }) => {
    const assignments = await request.json() as { order_id: number, driver_id: number }[];

    let assigned = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const assignment of assignments) {
      const order = mockOrders.find(o => o.id === assignment.order_id);
      const driver = mockDrivers.find(d => d.id === assignment.driver_id);

      if (!order) {
        failed++;
        errors.push({
          order_id: assignment.order_id,
          error: 'Order not found'
        });
      } else if (!driver) {
        failed++;
        errors.push({
          order_id: assignment.order_id,
          error: 'Driver not found'
        });
      } else {
        order.driver_id = assignment.driver_id;
        order.status = 'ASSIGNED';
        order.updated_at = new Date().toISOString();
        assigned++;
      }
    }

    return HttpResponse.json({
      success: failed === 0,
      assigned,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  }),

  // Drivers endpoints
  http.get(`${API_BASE}/drivers`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const size = Number(url.searchParams.get('size') || '10');
    const isAvailable = url.searchParams.get('is_available');
    const activeOnly = url.searchParams.get('active_only');

    let filteredDrivers = [...mockDrivers];

    // Filter by is_available param
    if (isAvailable) {
      filteredDrivers = filteredDrivers.filter(driver =>
        driver.is_available === (isAvailable === 'true')
      );
    }

    // Filter by active_only param (used by getAllOnline)
    if (activeOnly === 'true') {
      filteredDrivers = filteredDrivers.filter(driver => driver.is_available);
    }

    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedItems = filteredDrivers.slice(startIndex, endIndex);

    const response: PaginatedResponse<Driver> = {
      items: paginatedItems,
      total: filteredDrivers.length,
      page,
      size,
      pages: Math.ceil(filteredDrivers.length / size),
    };

    return HttpResponse.json(response);
  }),

  // Online drivers endpoint (must be before /drivers/:id to avoid shadowing)
  http.get(`${API_BASE}/drivers/online`, () => {
    const onlineDrivers = mockDrivers.filter(driver => driver.is_available);
    return HttpResponse.json(onlineDrivers);
  }),

  http.get(`${API_BASE}/drivers/:id`, ({ params }) => {
    const { id } = params;
    const driver = mockDrivers.find(d => d.id === Number(id));

    if (!driver) {
      return HttpResponse.json({ detail: 'Driver not found' }, { status: 404 });
    }

    return HttpResponse.json(driver);
  }),

  http.post(`${API_BASE}/drivers`, async ({ request }) => {
    const newDriver = await request.json() as any;

    // Check if user already exists as driver
    const existingDriver = mockDrivers.find(d => d.user_id === newDriver.user_id);

    if (existingDriver) {
      return HttpResponse.json(
        { detail: 'User already registered as driver' },
        { status: 409 }
      );
    }

    const createdDriver: Driver = {
      id: mockDrivers.length + 1,
      ...newDriver,
    };

    mockDrivers.push(createdDriver);

    return HttpResponse.json(createdDriver, { status: 201 });
  }),

  http.put(`${API_BASE}/drivers/:id`, async ({ request, params }) => {
    const { id } = params;
    const updateData = await request.json() as any;

    const driverIndex = mockDrivers.findIndex(d => d.id === Number(id));

    if (driverIndex === -1) {
      return HttpResponse.json({ detail: 'Driver not found' }, { status: 404 });
    }

    mockDrivers[driverIndex] = {
      ...mockDrivers[driverIndex],
      ...updateData,
    };

    return HttpResponse.json(mockDrivers[driverIndex]);
  }),

  http.patch(`${API_BASE}/drivers/:id/status`, async ({ request, params }) => {
    const { id } = params;
    const { is_available } = await request.json() as { is_available: boolean };

    const driver = mockDrivers.find(d => d.id === Number(id));

    if (!driver) {
      return HttpResponse.json({ detail: 'Driver not found' }, { status: 404 });
    }

    driver.is_available = is_available;

    return HttpResponse.json(driver);
  }),

  // Auth endpoints
  http.post(`${API_BASE}/login/access-token`, async ({ request }) => {
    const formData = await request.text();
    const params = new URLSearchParams(formData);
    const username = params.get('username');
    const password = params.get('password');

    // Mock authentication
    if (username === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        token_type: 'bearer',
      });
    }

    return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
  }),

  http.get(`${API_BASE}/users/me`, () => {
    // For testing purposes, always return the mock user
    // In integration tests, we assume authentication is handled
    return HttpResponse.json(mockUser);
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Successfully logged out' });
  }),

  // Token refresh endpoint
  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    const body = await request.json() as { refresh_token?: string };

    if (body.refresh_token === 'mock_refresh_token') {
      return HttpResponse.json({
        access_token: 'mock_access_token_refreshed',
        refresh_token: 'mock_refresh_token',
        token_type: 'bearer',
      });
    }

    return HttpResponse.json({ detail: 'Invalid refresh token' }, { status: 401 });
  }),

  // Batch Cancel endpoint
  http.post(`${API_BASE}/orders/batch-cancel`, async ({ request }) => {
    const { order_ids, reason } = await request.json() as { order_ids: number[], reason?: string };

    let cancelled = 0;
    const errors: any[] = [];

    for (const orderId of order_ids) {
      const order = mockOrders.find(o => o.id === orderId);

      if (!order) {
        errors.push({
          order_id: orderId,
          error: 'Order not found'
        });
      } else if (order.status === 'DELIVERED') {
        errors.push({
          order_id: orderId,
          error: 'Cannot cancel a delivered order'
        });
      } else if (order.status === 'CANCELLED') {
        errors.push({
          order_id: orderId,
          error: 'Order is already cancelled'
        });
      } else {
        order.status = 'CANCELLED';
        order.updated_at = new Date().toISOString();
        cancelled++;
      }
    }

    return HttpResponse.json({
      cancelled,
      errors,
    });
  }),

  // Batch Delete endpoint (admin only)
  http.post(`${API_BASE}/orders/batch-delete`, async ({ request }) => {
    const { order_ids } = await request.json() as { order_ids: number[] };

    // Simulate admin check - in real app this would check JWT claims
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }

    let deleted = 0;
    const errors: any[] = [];

    for (const orderId of order_ids) {
      const orderIndex = mockOrders.findIndex(o => o.id === orderId);

      if (orderIndex === -1) {
        errors.push({
          order_id: orderId,
          error: 'Order not found'
        });
      } else {
        mockOrders.splice(orderIndex, 1);
        deleted++;
      }
    }

    return HttpResponse.json({
      deleted,
      errors,
    });
  }),

  // Batch Delete - forbidden for non-admin
  http.post(`${API_BASE}/orders/batch-delete-forbidden`, () => {
    return HttpResponse.json(
      { detail: 'Only administrators can permanently delete orders' },
      { status: 403 }
    );
  }),

  // Error handlers for testing error scenarios
  http.get(`${API_BASE}/orders/error`, () => {
    return HttpResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }),

  http.get(`${API_BASE}/orders/timeout`, async () => {
    await delay(10000); // 10 second delay to test timeout
    return HttpResponse.json({ message: 'This should timeout' });
  }),
];
