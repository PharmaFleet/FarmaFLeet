# Testing Documentation

This document outlines the testing strategy and best practices for the PharmaFleet frontend application.

## Overview

We follow **Test-Driven Development (TDD)** methodology with a focus on maintaining **80%+ test coverage**. Our testing pyramid includes:

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test API endpoints and service interactions
3. **E2E Tests** - Test complete user journeys with Playwright

## Running Tests

### All Tests
```bash
# Run all unit and integration tests once
npm test

# Run tests in watch mode for development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI interface
npm run test:ui
```

### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (shows browser)
npm run test:e2e:headed

# View E2E test report
npm run test:e2e:report
```

### Pre-commit Checks
```bash
# Run the same checks as pre-commit hook
npm run pre-commit
```

## Test Structure

```
src/
├── __tests__/              # Test setup and mocks
│   ├── mocks/             # MSW mock handlers
│   │   ├── handlers.ts    # API mock handlers
│   │   └── server.ts      # MSW server setup
│   └── setup.ts          # Test setup file
├── services/
│   └── __tests__/        # Service unit tests
├── pages/
│   └── __tests__/        # Component tests
└── __tests__/           # Integration tests
    └── integration/
```

## Writing Tests

### Unit Tests Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderService } from '@/services/orderService';

describe('orderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch orders successfully', async () => {
    // Arrange
    const mockOrders = [{ id: 1, status: 'PENDING' }];
    vi.mocked(api.get).mockResolvedValue({ data: mockOrders });

    // Act
    const result = await orderService.getAll();

    // Assert
    expect(result).toEqual(mockOrders);
    expect(api.get).toHaveBeenCalledWith('/orders');
  });
});
```

### Component Tests Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    // Arrange
    render(<MyComponent />);

    // Assert
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    // Arrange
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests Example

```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '@/__tests__/mocks/server';

// Setup MSW server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API Integration', () => {
  it('should integrate with real API flow', async () => {
    // Test actual API interaction flow
  });
});
```

## TDD Workflow

### 1. Red - Write a Failing Test

```typescript
// Write test for a feature that doesn't exist yet
it('should calculate order total with tax', () => {
  const order = { amount: 100, tax: 15 };
  expect(calculateTotal(order)).toBe(115);
});
```

### 2. Green - Make it Pass

```typescript
// Write minimal implementation to make test pass
function calculateTotal(order) {
  return order.amount + order.tax;
}
```

### 3. Refactor - Improve Code

```typescript
// Refactor with better structure and error handling
function calculateTotal(order: Order): number {
  if (!order.amount || !order.tax) {
    throw new Error('Invalid order');
  }
  return order.amount + order.tax;
}
```

## Testing Best Practices

### DO's ✅

- **Test behavior, not implementation**
- **Write descriptive test names** that explain what is being tested
- **Use AAA pattern** (Arrange, Act, Assert)
- **Mock external dependencies** (API calls, database, etc.)
- **Test edge cases** (null, empty, error scenarios)
- **Keep tests isolated** - no shared state between tests
- **Use test utilities** like React Testing Library for components

### DON'Ts ❌

- **Don't test implementation details** (internal state, private methods)
- **Don't make tests depend on each other**
- **Don't use real API calls in unit tests**
- **Don't leave console.log statements in production code**
- **Don't ignore failing tests**

## Coverage Requirements

We maintain **80% minimum coverage** across all metrics:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

To view coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Mocking Strategies

### API Mocking with MSW

```typescript
// handlers.ts
export const handlers = [
  rest.get('/api/orders', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ items: [], total: 0 })
    );
  }),
];
```

### Component Mocking

```typescript
// Mock child components
vi.mock('@/components/ChildComponent', () => ({
  ChildComponent: ({ children }) => <div data-testid="child">{children}</div>,
}));
```

### Service Mocking

```typescript
// Mock service functions
vi.mock('@/services/orderService', () => ({
  orderService: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
}));
```

## E2E Testing with Playwright

### Page Object Model

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="login-button"]');
  }
}
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('user can login and view dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('admin@pharmafleet.com', 'admin123');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Welcome')).toBeVisible();
});
```

## CI/CD Integration

Tests run automatically on:
- **Pull Request creation**
- **Pull Request updates**
- **Merge to main branch**

The build will fail if:
- Tests don't pass
- Coverage drops below 80%
- Linting errors exist

## Pre-commit Hooks

Our pre-commit hooks ensure code quality by running:
1. Tests with coverage check
2. ESLint
3. Console.log detection
4. Package lock verification

To install hooks:
```bash
chmod +x setup-hooks.sh
./setup-hooks.sh
```

## Troubleshooting

### Tests Time Out
- Check for async/await issues
- Verify mock setup
- Ensure proper cleanup in afterEach

### Coverage is Low
- Use `npm run test:coverage` to see detailed report
- Identify untested paths
- Add tests for edge cases

### Mocks Not Working
- Clear mocks with `vi.clearAllMocks()`
- Verify mock configuration
- Check import paths

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)