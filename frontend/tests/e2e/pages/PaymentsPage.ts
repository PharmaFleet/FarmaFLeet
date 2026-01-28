import { Page, Locator, expect } from '@playwright/test';

export class PaymentsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly paymentsTable: Locator;
  readonly paymentRows: Locator;
  readonly filterButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h2:has-text("Payments")');
    this.searchInput = page.locator('input[placeholder="Search transaction, order #, or driver..."]');
    this.paymentsTable = page.locator('table');
    this.paymentRows = page.locator('table tbody tr');
    this.filterButton = page.locator('button:has-text("Filter")');
  }

  async goto() {
    await this.page.goto('/#/payments');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.paymentsTable).toBeVisible();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async getPaymentCount(): Promise<number> {
    return await this.paymentRows.count();
  }
}
