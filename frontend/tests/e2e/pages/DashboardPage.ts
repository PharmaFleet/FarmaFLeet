import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Dashboard Page
 * Encapsulates dashboard interactions and assertions
 */
export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statCards: Locator;
  readonly activeOrdersCard: Locator;
  readonly activeDriversCard: Locator;
  readonly pendingPaymentsCard: Locator;
  readonly successRateCard: Locator;
  readonly miniMap: Locator;
  readonly recentActivity: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h2:has-text("Dashboard")');
    this.statCards = page.locator('[class*="Card"]').filter({ has: page.locator('[class*="CardHeader"]') });
    this.activeOrdersCard = page.locator('text=Active Orders').locator('..').locator('..');
    this.activeDriversCard = page.locator('text=Active Drivers').locator('..').locator('..');
    this.pendingPaymentsCard = page.locator('text=Pending Payments').locator('..').locator('..');
    this.successRateCard = page.locator('text=Success Rate').locator('..').locator('..');
    this.miniMap = page.locator('text=Real-Time Tracking').locator('..').locator('..');
    this.recentActivity = page.locator('text=Recent Activity').locator('..').locator('..');
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.page.locator('text=Overview of today')).toBeVisible();
  }

  async expectStatsLoaded() {
    // Wait for skeletons to disappear and data to load
    await expect(this.page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });
    await expect(this.activeOrdersCard).toBeVisible();
    await expect(this.activeDriversCard).toBeVisible();
  }

  async getStatValue(cardLocator: Locator): Promise<string> {
    const valueElement = cardLocator.locator('.text-2xl');
    return await valueElement.textContent() || '';
  }
}
