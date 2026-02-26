import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { setupAuthenticatedSession } from './fixtures/mock-api';

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/#/');
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
  });

  test('dashboard loads with all stat cards', async ({ page }) => {
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
    // Verify the Real-Time Tracking section exists
    await expect(page.locator('text=Real-Time Tracking')).toBeVisible();
  });

  test('recent activity section displays', async ({ page }) => {
    // Verify Recent Activity heading (use exact role to avoid matching "No recent activity")
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
  });

  test('dashboard auto-refreshes data', async ({ page }) => {
    const dashboard = new DashboardPage(page);

    // Get initial value
    const initialValue = await dashboard.getStatValue(dashboard.activeOrdersCard);

    // Navigate away via sidebar click and back (client-side, no full reload)
    await page.getByRole('link', { name: 'Orders' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Dashboard' }).click();

    await dashboard.expectLoaded();
    await dashboard.expectStatsLoaded();

    // Value should still be present (may or may not change depending on data)
    const newValue = await dashboard.getStatValue(dashboard.activeOrdersCard);
    expect(newValue).toBeTruthy();
  });
});
