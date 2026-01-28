import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Orders Page
 * Encapsulates orders page interactions and assertions
 */
export class OrdersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly ordersTable: Locator;
  readonly orderRows: Locator;
  readonly importButton: Locator;
  readonly filterButton: Locator;
  readonly paginationPrev: Locator;
  readonly paginationNext: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h2:has-text("Orders")');
    this.searchInput = page.locator('input[placeholder="Search orders, customers, phone..."]');
    this.ordersTable = page.locator('table');
    this.orderRows = page.locator('table tbody tr');
    this.importButton = page.locator('button:has-text("Import")');
    this.filterButton = page.locator('button:has-text("Filter")');
    this.paginationPrev = page.locator('button:has-text("Previous")');
    this.paginationNext = page.locator('button:has-text("Next")');
  }

  async goto() {
    await this.page.goto('/#/orders');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.ordersTable).toBeVisible();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounced search
    await this.page.waitForTimeout(500);
  }

  async getOrderCount(): Promise<number> {
    return await this.orderRows.count();
  }

  async clickOrderRow(index: number) {
    await this.orderRows.nth(index).click();
  }

  async expectOrdersDisplayed() {
    await expect(this.orderRows.first()).toBeVisible({ timeout: 10000 });
  }
}
