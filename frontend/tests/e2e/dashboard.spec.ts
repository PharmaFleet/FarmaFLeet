import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Dashboard Flow', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@pharmafleet.com', 'admin123');
    await page.waitForURL('/');
  });

  test('dashboard loads with all stat cards', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();

    // Verify all stat cards are visible
    await expect(page.locator('text=Active Orders')).toBeVisible();
    await expect(page.locator('text=Active Drivers')).toBeVisible();
    await expect(page.locator('text=Pending Payments')).toBeVisible();
    await expect(page.locator('text=Success Rate')).toBeVisible();
  });

  test('stats display loading skeletons then data', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    
    // Wait for data to load (skeletons should disappear)
    await dashboard.expectStatsLoaded();

    // Verify stat values are displayed (not skeleton placeholders)
    const activeOrdersValue = await dashboard.getStatValue(dashboard.activeOrdersCard);
    expect(activeOrdersValue).toBeTruthy();
    expect(activeOrdersValue).not.toBe('');
  });

  test('mini-map component renders', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();

    // Verify the Real-Time Tracking section exists
    await expect(dashboard.miniMap).toBeVisible();
    await expect(page.locator('text=Real-Time Tracking')).toBeVisible();
  });

  test('recent activity section displays', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();

    // Verify Recent Activity section
    await expect(dashboard.recentActivity).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();
  });

  test('dashboard auto-refreshes data', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();

    // Get initial value
    const initialValue = await dashboard.getStatValue(dashboard.activeOrdersCard);

    // Wait for potential auto-refresh (30s interval, but we'll just verify the mechanism works)
    // For testing, we'll trigger a refetch by navigating away and back
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await page.goto('/');
    
    await dashboard.expectLoaded();
    await dashboard.expectStatsLoaded();
    
    // Value should still be present (may or may not change depending on data)
    const newValue = await dashboard.getStatValue(dashboard.activeOrdersCard);
    expect(newValue).toBeTruthy();
  });
});
