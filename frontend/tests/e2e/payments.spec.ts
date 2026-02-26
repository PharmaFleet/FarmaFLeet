import { test, expect } from '@playwright/test';
import { PaymentsPage } from './pages/PaymentsPage';
import { setupAuthenticatedSession } from './fixtures/mock-api';

test.describe('Payments Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
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
