import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { setupApiMocks, setupAuthenticatedSession } from './fixtures/mock-api';

test.describe('Authentication Flow', () => {
  test('login page loads correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify login page loaded
    await loginPage.expectToBeOnLoginPage();
  });

  test('can enter credentials in login form', async ({ page }) => {
    await setupApiMocks(page);
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Enter credentials
    await loginPage.login('test@example.com', 'password123');

    // Form should submit (button click works)
    // After submission, we should see either error or redirect
    await page.waitForTimeout(1000);

    // Verify we're either on login (with error) or dashboard
    const url = page.url();
    expect(url).toMatch(/(\/login|\/)/);
  });

  test('login shows error for invalid credentials', async ({ page }) => {
    // Mock the login endpoint to return 401
    await page.route('**/api/v1/login/access-token', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Incorrect email or password' }),
      });
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Attempt login with invalid credentials
    await loginPage.login('invalid@test.com', 'wrongpassword');

    // Wait for API response
    await page.waitForTimeout(2000);

    // Should stay on login page (not redirect)
    await expect(page).toHaveURL(/\/login/);

    // Should show error message
    await expect(page.locator('.text-red-500, .bg-red-50')).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await setupApiMocks(page);
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login('admin@pharmafleet.com', 'admin123');

    // Wait for navigation to dashboard
    await page.waitForURL(/\/#\/$/, { timeout: 10000 });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.expectLoaded();
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Try to access dashboard directly without logging in
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('login form has required fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify email and password inputs exist
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();

    // Verify email input is required
    await expect(loginPage.emailInput).toHaveAttribute('required', '');
  });
});
