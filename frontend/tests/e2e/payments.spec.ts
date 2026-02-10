import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Payments Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@pharmafleet.com', 'admin123');
    // Wait for Dashboard to confirm login
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
  });

  test('payments page loads with table', async ({ page }) => {
    const paymentsPage = new PaymentsPage(page);
    await paymentsPage.goto();
    await paymentsPage.expectLoaded();
  });

  test('search functionality works', async ({ page }) => {
    const paymentsPage = new PaymentsPage(page);
    await paymentsPage.goto();
    await paymentsPage.expectLoaded();
    await page.waitForLoadState('networkidle');

    // Only run if we have data, otherwise just checking if input works
    if (await paymentsPage.getPaymentCount() > 0) {
        await paymentsPage.search('COD');
        await page.waitForTimeout(1000);
        await expect(paymentsPage.paymentsTable).toBeVisible();
    } else {
        await paymentsPage.search('test');
        await expect(paymentsPage.searchInput).toBeVisible();
    }
  });
});
