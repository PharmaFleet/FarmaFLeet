# Testing Guide

This document outlines the testing strategies and best practices for the PharmaFleet system.

## 🧪 Testing Overview

The system employs a multi-layered testing approach:

1. **Unit & Integration Tests (Backend):** Pytest suite for API logic and database interactions.
2. **E2E Tests (Frontend):** Playwright suite for critical user flows across different browsers.

---

## 🎭 E2E Testing (Playwright)

We use Playwright for end-to-end testing of the Manager Dashboard.

### 🔑 Key Best Practices

#### 1. HashRouter Navigation

The application uses `HashRouter` (e.g., `/#/orders`). When writing tests:

- **Navigation:** Always include the hash in direct navigation: `await page.goto('/#/orders')`.
- **Waiting for URLs:** Avoid `page.waitForURL('/')` as it defaults to path-based routing. Instead:
  - Use regex/globs: `await page.waitForURL('**/#/')`
  - Prefer waiting for page-specific elements: `await dashboardPage.expectLoaded()`

#### 2. Robust Selectors

To avoid flaky tests and conflicts with global components (like the TopBar search):

- **Prefer Specificity:** Use placeholders or ARIA labels that are unique to the page.
- **Example:**
  ```typescript
  // Prefer exact placeholders
  this.searchInput = page.locator(
    'input[placeholder="Search orders, customers, phone..."]',
  );
  // Avoid generic ones that might match multiple inputs
  this.searchInput = page.locator('input[placeholder*="Search"]');
  ```

#### 3. Handling Stat Cards & Data Loading

When verifying dashboard statistics:

- **Select by Hierarchy:** Find the label first, then traverse to the value.
- **Explicit Waits:** Wait for the value to be visible to account for skeleton loading states.
- **Selectors:** Ensure selectors match the component's CSS classes (e.g., `.text-3xl` for stat values).

---

## ⚙️ Environment Configuration

For E2E tests to run smoothly across all browsers (including Firefox), specific network configurations are required:

### 1. Networking (IPv4 vs IPv6)

- **Playwright Config:** Use `http://127.0.0.1:3000` instead of `localhost` to ensure consistent IPv4 resolution across all browser engines.
- **Vite (Frontend):** Configure `vite.config.ts` with `host: true` to bind to all interfaces (`0.0.0.0`), making it accessible via IPv4.

### 2. Backend CORS

Ensure the backend allows requests from `127.0.0.1`. The `BACKEND_CORS_ORIGINS` in `backend/app/main.py` should include both `localhost` and `127.0.0.1` for development/testing ports.

---

## 🚀 Running Tests

### Frontend E2E

```bash
cd frontend
npx playwright test
```

### Backend Tests

```bash
cd backend
pytest
```
