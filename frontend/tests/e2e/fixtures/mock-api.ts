import { Page } from '@playwright/test';

/**
 * Mock API responses for E2E tests.
 * Intercepts network requests so tests don't require a running backend.
 *
 * IMPORTANT: In Playwright, routes are matched in REVERSE registration order
 * (last registered wins). So the catch-all must be registered FIRST and
 * specific routes AFTER so they take priority.
 */

const API_BASE = '**/api/v1';

const mockUser = {
  id: 1,
  email: 'admin@pharmafleet.com',
  full_name: 'Admin User',
  role: 'super_admin',
  is_active: true,
};

const mockTokenResponse = {
  access_token: 'mock-access-token-for-e2e-tests',
  refresh_token: 'mock-refresh-token-for-e2e-tests',
  token_type: 'bearer',
};

const mockDashboardMetrics = {
  total_orders_today: 45,
  active_orders: 12,
  delivered_today: 28,
  success_rate_today: 93.3,
  success_rate_all_time: 95.1,
  active_drivers: 8,
  total_drivers: 15,
  pending_payments: 5,
  pending_payment_amount: 1250.0,
  unassigned_today: 3,
};

const mockOrders = {
  items: [
    {
      id: 1,
      sales_order_number: 'SO-10001',
      customer_info: { name: 'Ahmed Al-Sabah', phone: '+965-1234-5678', address: 'Block 3, Street 5' },
      payment_method: 'cash',
      status: 'pending',
      total_amount: 45.5,
      warehouse: { id: 1, code: 'DW001', name: 'Default Warehouse' },
      warehouse_id: 1,
      created_at: '2026-02-26T10:00:00Z',
      updated_at: '2026-02-26T10:00:00Z',
      notes: null,
      driver: null,
      driver_id: null,
      sales_taker: 'Sales Rep 1',
    },
    {
      id: 2,
      sales_order_number: 'SO-10002',
      customer_info: { name: 'Fatima Hassan', phone: '+965-9876-5432', address: 'Block 1, Street 10' },
      payment_method: 'COD',
      status: 'assigned',
      total_amount: 120.0,
      warehouse: { id: 1, code: 'DW001', name: 'Default Warehouse' },
      warehouse_id: 1,
      created_at: '2026-02-26T09:30:00Z',
      updated_at: '2026-02-26T09:30:00Z',
      notes: 'Deliver before noon',
      driver: { id: 1, user: { full_name: 'Driver One' }, code: 'D001' },
      driver_id: 1,
      sales_taker: 'Sales Rep 2',
    },
    {
      id: 3,
      sales_order_number: 'SO-10003',
      customer_info: { name: 'Mohamed Ali', phone: '+965-5555-1234', address: 'Block 7, Street 2' },
      payment_method: 'credit',
      status: 'delivered',
      total_amount: 89.0,
      warehouse: { id: 2, code: 'DW002', name: 'Warehouse 2' },
      warehouse_id: 2,
      created_at: '2026-02-26T08:00:00Z',
      updated_at: '2026-02-26T11:00:00Z',
      delivered_at: '2026-02-26T11:00:00Z',
      notes: null,
      driver: { id: 2, user: { full_name: 'Driver Two' }, code: 'D002' },
      driver_id: 2,
      sales_taker: null,
    },
  ],
  total: 3,
  page: 1,
  size: 50,
  pages: 1,
};

const mockWarehouses = [
  { id: 1, code: 'DW001', name: 'Default Warehouse' },
  { id: 2, code: 'DW002', name: 'Warehouse 2' },
];

const mockPayments = {
  items: [
    {
      id: 1,
      order_id: 2,
      order: { id: 2, sales_order_number: 'SO-10002' },
      driver_id: 1,
      driver: { id: 1, user: { full_name: 'Driver One' }, code: 'D001' },
      amount: 120.0,
      payment_type: 'COD',
      status: 'pending',
      collected_at: '2026-02-26T12:00:00Z',
      verified_at: null,
      verified_by_id: null,
    },
  ],
  total: 1,
  page: 1,
  size: 25,
  pages: 1,
};

/**
 * Sets up localStorage auth state so the app thinks we're logged in.
 * Must be called before navigating to any authenticated page.
 */
export async function setupAuthState(page: Page) {
  await page.addInitScript(() => {
    const authState = {
      state: {
        user: {
          id: 1,
          email: 'admin@pharmafleet.com',
          full_name: 'Admin User',
          role: 'super_admin',
          is_active: true,
        },
        token: 'mock-access-token-for-e2e-tests',
        refreshToken: 'mock-refresh-token-for-e2e-tests',
        isAuthenticated: true,
      },
      version: 0,
    };
    localStorage.setItem('pharmafleet-auth', JSON.stringify(authState));
  });
}

/**
 * Sets up API route mocks so tests don't need a running backend.
 * Call this before navigating to pages that fetch data.
 *
 * Routes are registered catch-all FIRST, then specific routes AFTER
 * because Playwright uses last-registered-wins matching.
 */
export async function setupApiMocks(page: Page) {
  // 1. CATCH-ALL registered FIRST (lowest priority - checked last)
  //    Returns empty arrays for GET to avoid crashing components
  //    that call .filter() or .map() on response data.
  await page.route(`${API_BASE}/**`, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });

  // 2. SPECIFIC routes registered AFTER (higher priority - checked first)

  // Auth endpoints
  await page.route(`${API_BASE}/login/access-token`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTokenResponse),
    });
  });

  await page.route(`${API_BASE}/users/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  await page.route(`${API_BASE}/auth/refresh`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTokenResponse),
    });
  });

  // Notifications - MUST return a plain array (NotificationCenter calls .filter() on it)
  await page.route(`${API_BASE}/notifications*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Dashboard / Analytics
  await page.route(`${API_BASE}/analytics/executive-dashboard*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDashboardMetrics),
    });
  });

  await page.route(`${API_BASE}/analytics/activities*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(`${API_BASE}/analytics/daily-orders*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { date: '2026-02-26', count: 12 },
        { date: '2026-02-25', count: 18 },
        { date: '2026-02-24', count: 15 },
      ]),
    });
  });

  await page.route(`${API_BASE}/analytics/driver-performance*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(`${API_BASE}/analytics/orders-by-warehouse*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Orders (with query params)
  await page.route(`${API_BASE}/orders?*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOrders),
    });
  });

  // Orders (without query params)
  await page.route(`${API_BASE}/orders`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOrders),
    });
  });

  // Warehouses
  await page.route(`${API_BASE}/warehouses*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockWarehouses),
    });
  });

  // Payments (with query params)
  await page.route(`${API_BASE}/payments?*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPayments),
    });
  });

  // Payments (without query params)
  await page.route(`${API_BASE}/payments`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPayments),
    });
  });

  // Drivers / Locations
  await page.route(`${API_BASE}/drivers/locations*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Drivers list (paginated format)
  await page.route(`${API_BASE}/drivers?*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 25, pages: 0 }),
    });
  });

  await page.route(`${API_BASE}/drivers`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 25, pages: 0 }),
    });
  });
}

/**
 * Combined setup: API mocks + auth state.
 * Use in beforeEach for any test that needs an authenticated session.
 */
export async function setupAuthenticatedSession(page: Page) {
  await setupApiMocks(page);
  await setupAuthState(page);
}
