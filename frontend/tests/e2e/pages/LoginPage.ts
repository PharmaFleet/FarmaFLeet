import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Login Page
 * Encapsulates login page interactions and assertions
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly demoCredentialsHint: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.text-red-500');
    this.demoCredentialsHint = page.locator('text=Demo credentials');
  }

  async goto() {
    await this.page.goto('/#/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectToBeOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(this.emailInput).toBeVisible();
  }
}
