import { rest } from 'msw';
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

// API handlers
export const handlers = [
  // Orders endpoints
  rest.get('/api/orders', (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page') || '1');
    const size = Number(req.url.searchParams.get('size') || '10');
    const status = req.url.searchParams.get('status');
    const warehouseId = req.url.searchParams.get('warehouse_id');

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

    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),

  rest.get('/api/orders/:id', (req, res, ctx) => {
    const { id } = req.params;
    const order = mockOrders.find(o => o.id === Number(id));

    if (!order) {
      return res(
        ctx.status(404),
        ctx.json({ detail: 'Order not found' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json(order)
    );
  }),

  rest.post('/api/orders', async (req, res, ctx) => {
    const newOrder = await req.json();
    
    const createdOrder: Order = {
      id: mockOrders.length + 1,
      ...newOrder,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockOrders.push(createdOrder);

    return res(
      ctx.status(201),
      ctx.json(createdOrder)
    );
  }),

  rest.post('/api/orders/:id/assign', (req, res, ctx) => {
    const { id } = req.params;
    const { driver_id } = req.json() as { driver_id: number };

    const order = mockOrders.find(o => o.id === Number(id));
    
    if (!order) {
      return res(
        ctx.status(404),
        ctx.json({ detail: 'Order not found' })
      );
    }

    const driver = mockDrivers.find(d => d.id === driver_id);
    
    if (!driver) {
      return res(
        ctx.status(404),
        ctx.json({ detail: 'Driver not found' })
      );
    }

    order.driver_id = driver_id;
    order.status = 'ASSIGNED';
    order.updated_at = new Date().toISOString();

    return res(
      ctx.status(200),
      ctx.json({ 
        success: true, 
        message: 'Driver assigned successfully' 
      })
    );
  }),

  rest.post('/api/orders/:id/unassign', (req, res, ctx) => {
    const { id } = req.params;
    const order = mockOrders.find(o => o.id === Number(id));
    
    if (!order) {
      return res(
        ctx.status(404),
        ctx.json({ detail: 'Order not found' })
      );
    }

    order.driver_id = undefined;
    order.status = 'PENDING';
    order.updated_at = new Date().toISOString();

    return res(
      ctx.status(200),
      ctx.json({ 
        success: true, 
        message: 'Driver unassigned successfully' 
      })
    );
  }),

  rest.post('/api/orders/batch-assign', async (req, res, ctx) => {
    const assignments = await req.json() as { order_id: number, driver_id: number }[];
    
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

    return res(
      ctx.status(200),
      ctx.json({
        success: failed === 0,
        assigned,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      })
    );
  }),

  // Drivers endpoints
  rest.get('/api/drivers', (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page') || '1');
    const size = Number(req.url.searchParams.get('size') || '10');
    const isAvailable = req.url.searchParams.get('is_available');

    let filteredDrivers = mockDrivers;

    if (isAvailable) {
      filteredDrivers = filteredDrivers.filter(driver => 
        driver.is_available === (isAvailable === 'true')
      );
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

    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),

  rest.get('/api/drivers/:id', (req, res, ctx) => {
    const { id } = req.params;
    const driver = mockDrivers.find(d => d.id === Number(id));

    if (!driver) {
      return res(
        ctx.status(404),
        ctx.json({ detail: 'Driver not found' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json(driver)
    );
  }),

  rest.post('/api/drivers', async (req, res, ctx) => {
    const newDriver = await req.json();
    
    // Check if user already exists as driver
    const existingDriver = mockDrivers.find(d => d.user_id === newDriver.user_id);
    
    if (existingDriver) {
      return res(
        ctx.status(409),
        ctx.json({ detail: 'User already registered as driver' })
      );
    }

    const createdDriver: Driver = {
      id: mockDrivers.length + 1,
      ...newDriver,
    };

    mockDrivers.push(createdDriver);

    return res(
      ctx.status(201),
      ctx.json(createdDriver)
    );
  }),

  rest.put('/api/drivers/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updateData = await req.json();
    
    const driverIndex = mockDrivers.findIndex(d => d.id === Number(id));
    
    if (driverIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({ detail: 'Driver not found' })
      );
    }

    mockDrivers[driverIndex] = {
      ...mockDrivers[driverIndex],
      ...updateData,
    };

    return res(
      ctx.status(200),
      ctx.json(mockDrivers[driverIndex])
    );
  }),

  rest.patch('/api/drivers/:id/status', async (req, res, ctx) => {
    const { id } = req.params;
    const { is_available } = await req.json();
    
    const driver = mockDrivers.find(d => d.id === Number(id));
    
    if (!driver) {
      return res(
        ctx.status(404),
        ctx.json({ detail: 'Driver not found' })
      );
    }

    driver.is_available = is_available;

    return res(
      ctx.status(200),
      ctx.json(driver)
    );
  }),

  // Auth endpoints
  rest.post('/api/login/access-token', async (req, res, ctx) => {
    const formData = await req.text();
    const params = new URLSearchParams(formData);
    const username = params.get('username');
    const password = params.get('password');

    // Mock authentication
    if (username === 'test@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          token_type: 'bearer',
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({ detail: 'Invalid credentials' })
    );
  }),

  rest.get('/api/users/me', (req, res, ctx) => {
    // Check for valid authorization header
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.includes('Bearer mock_access_token')) {
      return res(
        ctx.status(401),
        ctx.json({ detail: 'Not authenticated' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json(mockUser)
    );
  }),

  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Successfully logged out' })
    );
  }),

  // Batch Cancel endpoint
  rest.post('/api/v1/orders/batch-cancel', async (req, res, ctx) => {
    const { order_ids, reason } = await req.json() as { order_ids: number[], reason?: string };

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

    return res(
      ctx.status(200),
      ctx.json({
        cancelled,
        errors,
      })
    );
  }),

  // Batch Delete endpoint (admin only)
  rest.post('/api/v1/orders/batch-delete', async (req, res, ctx) => {
    const { order_ids } = await req.json() as { order_ids: number[] };

    // Simulate admin check - in real app this would check JWT claims
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return res(
        ctx.status(401),
        ctx.json({ detail: 'Not authenticated' })
      );
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

    return res(
      ctx.status(200),
      ctx.json({
        deleted,
        errors,
      })
    );
  }),

  // Batch Delete - forbidden for non-admin
  rest.post('/api/v1/orders/batch-delete-forbidden', async (req, res, ctx) => {
    return res(
      ctx.status(403),
      ctx.json({ detail: 'Only administrators can permanently delete orders' })
    );
  }),

  // Error handlers for testing error scenarios
  rest.get('/api/orders/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ detail: 'Internal server error' })
    );
  }),

  rest.get('/api/orders/timeout', (req, res, ctx) => {
    return res(
      ctx.delay(10000), // 10 second delay to test timeout
      ctx.status(200),
      ctx.json({ message: 'This should timeout' })
    );
  }),
];