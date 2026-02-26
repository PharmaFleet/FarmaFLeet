# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note**: The root `../CLAUDE.md` covers the full-stack project. This file adds frontend-specific detail.

## Development Commands

```bash
npm run dev                    # Vite dev server (port 3000)
npm run build                  # Production build
npm run lint                   # ESLint

# Unit tests (Vitest + jsdom + MSW)
npm run test                   # All tests (single run)
npm run test:watch             # Watch mode
npm test -- OrdersPage.test    # Single file
npm run test:coverage          # Coverage report (80% threshold)
npm run test:ui                # Vitest UI dashboard

# E2E tests (Playwright - auto-starts dev server)
npm run test:e2e               # All browsers
npm run test:e2e -- --project=chromium   # Chromium only
npm run test:e2e:headed        # Visible browser
npm run test:e2e:ui            # Playwright UI
```

## Architecture

### Stack
React 18 + Vite + TypeScript (strict) + Tailwind CSS 4 + shadcn/ui (Radix primitives) + React Query v5 + Zustand v5 + react-router-dom v7 (HashRouter)

### Project Structure
```
src/
├── components/
│   ├── ui/           # shadcn/ui primitives (button, dialog, select, etc.)
│   ├── layout/       # LayoutShell, Sidebar, TopBar
│   ├── orders/       # Order dialogs (assign, batch, cancel, return)
│   ├── drivers/      # Add/Edit driver dialogs
│   ├── dashboard/    # Mini map, recent activity
│   ├── analytics/    # KPI cards, charts
│   ├── maps/         # Google Maps provider, markers, routes
│   └── shared/       # StatusBadge, VehicleIcon, NotificationCenter
├── pages/            # Route page components (lazy-loaded)
├── services/         # API client functions (one per domain)
├── hooks/            # Custom hooks (column order/resize, batch ops, debounce)
├── store/            # useAuthStore (Zustand + localStorage persist)
├── stores/           # analyticsStore, driversStore
├── types/            # TypeScript interfaces (index.ts)
├── lib/              # axios instance, formatters, cn() utility
└── __tests__/        # Unit tests, MSW mocks, setup
tests/e2e/            # Playwright E2E tests (page objects + API mocks)
```

### Routing (HashRouter)
URLs use `/#/path` format for Vercel static hosting. Routes defined in `App.tsx`:
- `/login` — public
- All other routes wrapped in `<LayoutShell>` which redirects to `/login` if not authenticated
- Pages are lazy-loaded with `React.lazy()` + `Suspense`

### State Management (Two Layers)

**Zustand** for global client state:
- `useAuthStore` (`store/useAuthStore.ts`) — user, token, refreshToken, isAuthenticated. Persisted to localStorage key `pharmafleet-auth`.
- `useAnalyticsStore` (`stores/analyticsStore.ts`) — date ranges, KPI data
- `useDriversStore` (`stores/driversStore.ts`) — driver locations, status filter

**React Query** for server state:
- `staleTime: 30s`, `gcTime: 5m`, `retry: 2`, `refetchOnWindowFocus: false`
- Query keys: `['orders']`, `['order', id]`, `['drivers']`, `['available-drivers']`, `['analytics']`
- Mutations invalidate related query keys on success (no optimistic updates)

### API Layer
`lib/axios.ts` creates an Axios instance with base URL from `VITE_API_URL`. Interceptors:
- **Request**: attaches Bearer token from auth store
- **Response**: handles 401 with token refresh queue pattern (prevents concurrent refresh attempts). If refresh fails, calls `logout()`.

Service files in `services/` wrap API calls: `orderService`, `driverService`, `paymentService`, `analyticsService`, `authService`, `warehouseService`, `userService`, `notificationService`.

### Per-User Workspace Preferences
Column visibility, order, and widths stored in localStorage keyed by userId:
```
orders-column-visibility:user-{userId}
orders-column-order:user-{userId}
orders-column-widths:user-{userId}
```
Hooks accept optional `userId` parameter; without it, falls back to generic keys (for tests).

## Key Patterns

### Dialog Pattern
All dialogs receive `open` + `onOpenChange` props. State is lifted to the parent page:
```tsx
<AssignDriverDialog open={dialogOpen} onOpenChange={setDialogOpen} orderId={id} />
```
Dialogs use `useMutation` for submission + `queryClient.invalidateQueries` on success.

### Batch Operations
Batch hooks (`useBatchAssign`, `useBulkCancel`, `useBulkDelete`, `useBulkReturn`) wrap service calls and handle toast notifications + query invalidation.

### Column Management (OrdersPage)
- `useColumnOrder(userId)` — visibility toggles + drag-and-drop reorder via @dnd-kit
- `useColumnResize(userId)` — mouse-drag column width resizing
- Default visible: checkbox, order_number, customer, status, driver, warehouse, amount, created, actions (9 of 18 total columns)

## Testing

### Unit Tests (Vitest)
- Environment: jsdom with MSW for API mocking
- Setup file: `src/__tests__/setup.ts` (mocks matchMedia, ResizeObserver, PointerEvent)
- MSW handlers: `src/__tests__/mocks/handlers.ts`
- Test timeout: 10 seconds
- Coverage threshold: 80% (branches, functions, lines, statements)

### E2E Tests (Playwright)
- Tests in `tests/e2e/`, page objects in `tests/e2e/pages/`
- API mocking via `tests/e2e/fixtures/mock-api.ts` — no backend required
- `setupAuthenticatedSession(page)` injects auth state + registers API route mocks
- Playwright auto-starts dev server; CI uses `--project=chromium` with 1 worker
- Retries: 2 on CI, 0 locally

### Testing Gotchas
- **NEVER use `vi.useFakeTimers()`** with React Query — it poisons subsequent tests. Use `waitFor({timeout: 3000})` instead.
- When text appears in multiple places (e.g., "Delivered" in tabs and columns), use role-based selectors: `getByRole('heading', { name: '...' })`.
- Optimistic update `queryClient.setQueryData` keys must exactly match `useQuery` queryKey.

## Common Gotchas

### File Upload
Unset Content-Type so Axios sets the multipart boundary:
```typescript
await api.post('/orders/import', formData, { headers: { 'Content-Type': undefined } });
```

### shadcn/ui Select with Empty Value
Empty string is a valid value for clearing selection:
```tsx
<SelectItem value="">No driver (assign later)</SelectItem>
```

### Google Maps
- Default center: Kuwait City `{ lat: 29.3759, lng: 47.9774 }`
- Use `Marker` with SVG data URLs (not `AdvancedMarker` — requires Map ID)
- Library: `@vis.gl/react-google-maps`

### No WebSocket on Vercel
All real-time data uses HTTP polling:
- Map: `/drivers/locations` every 5s
- Dashboard: 30s refetchInterval
- Analytics: 60s interval

### Type Interface Gotchas
- `Order.total_amount` (not `amount`) — used with `.toFixed(3)` for display
- `Order.customer_info` is an object `{ name, phone, address }` (not flat fields)
- `OrderStatusHistory` uses `timestamp`, NOT `created_at`
- `ProofOfDelivery` is singular object (`uselist=False`), not an array
- Pagination response uses `size` field (not `per_page`)

### Orders Page Date Range
Defaults to `'all'` (no date filter). Do not default to `'today'` — it hides historical orders. Per-user preference persisted in localStorage.

## Environment Variables
```
VITE_API_URL=http://localhost:8000/api/v1    # Backend API base
VITE_GOOGLE_MAPS_API_KEY=<key>               # Google Maps (optional for dev)
```

## Path Aliases
`@` resolves to `./src` (configured in both `vite.config.ts` and `tsconfig.json`):
```typescript
import { Button } from '@/components/ui/button';
```
