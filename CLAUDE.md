# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PharmaFleet is a delivery management system for pharmacy operations in Kuwait. Three applications:
- **Backend**: FastAPI (Python 3.11) with async SQLAlchemy + PostgreSQL (Supabase) + Redis
- **Frontend**: React (Vite) + shadcn/ui + React Query + Zustand
- **Mobile**: Flutter Android driver app with BLoC pattern + offline-first

Orders are imported from Microsoft Dynamics 365 Excel exports. Drivers are assigned manually (managers prefer control over algorithms). UI is bilingual (English/Arabic).

## Production Deployment

**URL**: https://pharmafleet-olive.vercel.app

- Frontend: Static build at root (`/`)
- Backend: Python serverless at `/api/*` via `backend/api/index.py` (native FastAPI, no Mangum)
- Database: Supabase PostgreSQL with PgBouncer (requires `statement_cache_size=0`)
- Storage: Supabase Storage for proof of delivery images
- Push to `main` triggers automatic deployment

**Vercel size limit**: Serverless function must stay under 250 MB unzipped. `pandas` is excluded from `backend/api/requirements.txt` (replaced by openpyxl + lxml). Keep heavy deps out of that file.

## Development Commands

### Backend
```bash
cd backend
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Tests (SQLite in-memory, no Docker needed)
pytest                                          # All tests
pytest tests/test_orders.py::test_create_order -v  # Single test
pytest --cov=app --cov-report=term-missing      # Coverage

# Lint (pyproject.toml: black line-length=88, isort profile=black)
black app/
flake8 app/ --max-line-length=100
```

### Frontend
```bash
cd frontend
npm install
npm run dev                    # Dev server (port 3000)
npm run build                  # Production build
npm run test                   # Vitest
npm test -- OrdersPage.test.tsx  # Single file
npm run test:e2e               # Playwright
npm run lint
```

### Mobile
```bash
cd mobile/driver_app
flutter pub get
flutter run                                    # Dev mode (points to 10.0.2.2:8000)
flutter run --dart-define=ENV=dev              # Explicit dev environment
flutter run --dart-define=API_URL=http://192.168.1.100:8000/api/v1  # Custom API
flutter test
```

### Docker (full stack)
```bash
make dev          # Start all services (Linux/macOS)
make db-reset     # Drop, recreate, migrate, seed
make db-migrate   # Run alembic migrations inside container
make test         # Backend tests
make logs-backend # View backend logs

# Windows (no make):
docker compose up -d
docker exec delivery-system-iii-backend-1 alembic upgrade head
docker compose restart backend   # After code changes (no auto-reload)
```

**Docker ports**: Backend 8080->host 8000, Frontend nginx 80->host 3000, DB 5432->host 5444.

### Seeding Scripts
```bash
cd backend
python scripts/seed_superadmin.py   # Create admin user
python scripts/seed_accounts.py     # Seed from accounts.xlsx
python scripts/seed_warehouses.py   # Seed warehouses from Excel
```

## Architecture Patterns

### Backend: Async SQLAlchemy with `lazy='raise'`

All models use `lazy='raise'` on relationships. Relationships **must** be eagerly loaded:

```python
# WRONG - raises error
driver = await db.get(Driver, driver_id)
driver.user  # raises!

# CORRECT
result = await db.execute(
    select(Driver).where(Driver.id == driver_id)
    .options(selectinload(Driver.user), selectinload(Driver.warehouse))
)
```

When returning ORM objects through Pydantic schemas (`from_attributes=True`), construct schemas explicitly to avoid bidirectional lazy loading:

```python
# WRONG - Pydantic may traverse all ORM attributes
return DriverSchema(id=driver.id, user=current_user)

# CORRECT - construct with only needed fields
user_schema = UserSchema(id=current_user.id, email=current_user.email, ...)
return DriverSchema(id=driver.id, user=user_schema)
```

### Backend: Transaction Pattern

Use `db.flush()` for mid-transaction ID generation. One `db.commit()` per endpoint:

```python
db.add(order)
await db.flush()          # ID available now, but not committed
db.add(OrderStatusHistory(order_id=order.id, ...))
await db.commit()         # Single commit for entire operation
```

### Backend: Warehouse Access Control

`get_user_warehouse_ids()` in `backend/app/api/deps.py` returns `None` for super_admins (all access) or a list of warehouse IDs for scoped users. Always filter queries:

```python
warehouse_ids = await get_user_warehouse_ids(user, db)
if warehouse_ids is not None:
    query = query.where(Order.warehouse_id.in_(warehouse_ids))
```

**Known limitation**: warehouse_manager, dispatcher, and executive roles currently have access to ALL warehouses (returns `None`). TODO in deps.py to add per-user warehouse scoping.

### Backend: Role-Based Dependencies

Dependency functions in `deps.py` for authorization:
- `get_current_active_user` - any authenticated user
- `get_current_admin_user` - super_admin only
- `get_current_manager_or_above` - super_admin or warehouse_manager
- `get_current_dispatcher_or_above` - super_admin, warehouse_manager, or dispatcher
- `requires_role(allowed_roles)` - generic role checker

### Backend: Custom Exception Hierarchy

`PharmaFleetException` base class in `app/core/exceptions.py` with `error_code` and `status_code`. Global handler in `main.py` returns `{"error_code": "...", "message": "..."}`. Subclasses: `OrderNotFoundException`, `OrderStatusTransitionError`, `WarehouseAccessDeniedException`, `DriverNotFoundException`, `DriverNotAvailableException`, `InvalidFileFormatException`.

### Backend: Route Ordering

Static routes MUST come before parameterized routes to avoid shadowing:

```python
@router.post("/auto-archive")   # Static routes first
@router.post("/batch-cancel")
@router.post("/batch-assign")
@router.post("/{order_id}/assign")  # Parameterized routes last
```

### Backend: OrderStatus Enum

`OrderStatus` inherits from `(str, enum.Enum)` so string comparisons work directly:

```python
# WRONG
if order.status == OrderStatus.DELIVERED.value

# CORRECT - no .value needed
if order.status == OrderStatus.DELIVERED
```

### Backend: Batch Operations Pattern

Batch endpoints use bulk fetch with dict map lookup to avoid N+1 queries:

```python
result = await db.execute(select(Order).where(Order.id.in_(request.order_ids)))
orders_map = {o.id: o for o in result.scalars().all()}

for order_id in request.order_ids:
    order = orders_map.get(order_id)
    if not order:
        errors.append({"order_id": order_id, "error": "Order not found"})
        continue
```

All batch error responses use the standard format: `{"order_id": <id>, "error": "<message>"}`.

### Backend: Service Layer

Business logic in `backend/app/services/`:
- `order_assignment.py` - Driver assignment and unassignment
- `order_status.py` - Status transitions and validation
- `order_query.py` - Query building and filtering with warehouse scoping
- `proof_of_delivery.py` - POD handling and Supabase storage upload
- `notification.py` - FCM push notifications via Firebase Admin SDK
- `auth.py` - Token creation, refresh, blacklisting (Redis-backed)
- `storage.py` - Supabase storage operations
- `excel.py` - File parsing (xlsx via openpyxl, csv via stdlib, HTML via lxml) and `write_xlsx()` for exports

### Backend: Middleware Stack

Configured in `main.py` (order matters - CORS is outermost):
1. **CORSMiddleware** - Auto-includes localhost:3000/3001/5173 in dev
2. **RateLimitMiddleware** - IP-based, 1000 requests/60s via Redis, fails open
3. **RequestLoggingMiddleware** - Logs all requests with timing and request IDs
4. **slowapi** - Endpoint-specific rate limits (`@limiter.limit("5/minute")`)

### Backend: Auth & Token Management

- Access tokens: 24 hours (`ACCESS_TOKEN_EXPIRE_MINUTES=1440`, extended for mobile reliability)
- Refresh tokens: 30 days. `POST /auth/refresh` endpoint
- Token blacklist via Redis (checked in `get_current_user`)
- Frontend axios interceptor queues requests during refresh to prevent concurrent refresh attempts
- Mobile DioClient uses separate Dio instance for refresh to avoid interceptor loops

### Frontend: HashRouter + Polling Architecture

- Uses `HashRouter` (`/#/` URLs) for Vercel static hosting compatibility
- **WebSocket is disabled on Vercel** (commented out in MapView.tsx). All real-time data uses HTTP polling:
  - Map: polls `/drivers/locations` every 5 seconds
  - Dashboard: 30-second `refetchInterval` via React Query
  - Analytics: 60-second interval
- Mobile sends location via HTTP POST to `/drivers/location` (singular); frontend fetches from `/drivers/locations` (plural)
- Auth state persisted to localStorage (`pharmafleet-auth` key) via zustand/middleware/persist

### Frontend: Per-User Workspace Preferences

Column visibility, column order, column widths, and date range preferences are stored in localStorage **keyed by user ID**. Key pattern: `orders-column-visibility:user-{userId}`. Each admin/manager gets their own customized workspace that persists across sessions. Hooks accept an optional `userId` parameter:

```typescript
const { orderedColumns, toggleColumn } = useColumnOrder(userId);
const { widths, onMouseDown } = useColumnResize(userId);
```

Without a `userId`, falls back to generic keys (backward-compatible with tests).

### Frontend: Column Visibility System

`useColumnOrder` hook in `frontend/src/hooks/useColumnOrder.ts` manages which columns are visible. Default essential columns: checkbox, order_number, customer, status, driver, warehouse, amount, created, actions. Users can toggle individual columns or show all via the Columns dropdown. Column drag-and-drop reorder via `@dnd-kit`.

### Frontend: Analytics (Real Data)

Analytics page (`frontend/src/pages/analytics/AnalyticsPage.tsx`) uses real API endpoints, not mock data:
- `GET /analytics/dashboard` - KPI metrics (active orders, success rate, active drivers, pending payments)
- `GET /analytics/daily-orders?days=7` - Daily order volume with zero-fill for missing days
- `GET /analytics/driver-performance` - Top 10 drivers by delivered/failed orders
- `GET /analytics/orders-by-warehouse` - Pie chart of orders per warehouse

### Frontend: Actionable Dashboard

Dashboard stat cards are clickable (navigate to relevant pages). Unassigned orders alert banner appears when `unassigned_today > 0`. Success rate shows both today and all-time values.

### Mobile: Offline-First + Token Refresh

- Hive for local persistence, queued actions sync when online via `/sync` endpoints
- BLoC pattern (flutter_bloc) for state management
- Background location tracking continues when app is backgrounded
- 3-tab order structure: Assigned -> Active (picked_up/in_transit/out_for_delivery) -> History
- Build-time config via `--dart-define`. See `lib/core/config/app_config.dart`:
  - `ENV=dev|staging|prod` (default: prod)
  - `API_URL=<url>` - Override API base URL
  - `SENTRY_DSN=<dsn>` - Enable Sentry error monitoring

## Scheduled Jobs (Cron)

Vercel cron jobs in `vercel.json`:
- `/api/v1/cron/auto-archive` - Archives delivered orders older than 24h (daily at 2 AM UTC)
- `/api/v1/cron/cleanup-old-locations` - Deletes driver location records older than 7 days (daily at 3 AM UTC)
- `/api/v1/cron/auto-expire-stale` - Auto-cancels pending/assigned orders older than 7 days (daily at 4 AM UTC)
- `/api/v1/cron/check-driver-shifts` - Sends FCM push to drivers online 10+ hours (hourly)

Cron endpoints require `CRON_SECRET` in Authorization header. Logic in `backend/app/api/v1/endpoints/cron.py`.

### Driver Shift Notifications

The `check-driver-shifts` cron uses Redis-based throttling to avoid spamming drivers. Key pattern: `shift_notif:{driver_id}:{hour}` with 3600s TTL. Notification is sent via FCM with dynamic message content showing hours worked. The inline 12h check in `drivers.py` was removed in favor of this cron.

## Database

PostgreSQL with PostGIS. Migrations via Alembic.
- **Alembic autogenerate requires a live DB connection** - create migrations manually when DB is unavailable
- Key tables: users, drivers, orders, order_status_history, proof_of_delivery, warehouses, notifications, payment_collections, driver_locations
- Warehouse codes from Excel imports (DW001-DW010, BV001-BV004, CCB01) - always display `warehouse.code`, not `warehouse_id`
- `backend/app/db/session.py` auto-detects `VERCEL`/`AWS_LAMBDA_FUNCTION_NAME` env vars for serverless pool settings (pool_size=1, statement_cache_size=0)
- `DriverLocation` uses PostGIS `Geometry("POINT", srid=4326)` with computed `latitude`/`longitude` columns via `ST_Y()`/`ST_X()`

## Key Business Rules

- **Manual assignment**: No auto-assignment. Managers know their drivers and areas.
- **24-hour archive buffer**: Delivered orders get `delivered_at` set, NOT `is_archived = True`. Orders stay in "Delivered" tab for 24h, then `/auto-archive` cron moves them to archive.
- **POD optional**: Proof of delivery (photo/signature) is optional when completing deliveries.
- **Order statuses**: pending -> assigned -> picked_up -> in_transit -> out_for_delivery -> delivered/rejected/returned/cancelled
- **Five roles**: super_admin, warehouse_manager, dispatcher, executive, driver
- **Batch operations**: Bulk assign, cancel, delete, pickup, delivery, return, and cancel-stale in `orders.py`
- **Stale order cleanup**: `POST /orders/batch-cancel-stale` cancels pending/assigned orders older than N days (default 7). Requires manager+ role. Creates audit trail via OrderStatusHistory.
- **Column rename**: `sales_track` was renamed to `sales_taker` (migration `c8f3a1b2d4e5`). Use `sales_taker` everywhere.
- **Driver code**: Defaults to `biometric_id` when not explicitly provided. Unique constraint on `code` column.
- **Driver user updates**: `PUT /drivers/{id}` accepts `user_full_name` and `user_phone` to update the associated User model in the same transaction.
- **Payment verification**: Managers verify cash/COD collections via `POST /payments/{id}/clear`, sets `verified_by_id` and `verified_at`.

## Testing

Backend tests use **SQLite in-memory** (no Docker/PostgreSQL required). `conftest.py` patches GeoAlchemy2 and JSONB types for SQLite compatibility. Redis is fully mocked. `asyncio_mode = "auto"` in `pyproject.toml`.

**Caveat**: Tests using the sync `client` fixture (TestClient) must be sync functions (`def test_...`), not `async def`. Mixing `async def` with the sync fixture causes event loop scope conflicts.

**Known flaky tests**: WebSocket/realtime map tests occasionally fail due to async mock timing. Skip with `-k "not (websocket or Realtime)"` when unrelated.

## Common Gotchas

### Backend: `Body(embed=True)` Required for Mixed Params

FastAPI `Body()` parameters need `embed=True` when the endpoint has a path/query param AND a body param, or when multiple body params exist. Without it, the body data is silently lost:

```python
# WRONG - reason is always None
async def cancel_order(order_id: int, reason: str = Body(None)):

# CORRECT
async def cancel_order(order_id: int, reason: str = Body(None, embed=True)):
```

### Backend: Always Use Timezone-Aware Datetimes

```python
# WRONG - naive datetime
datetime.utcnow()

# CORRECT - timezone-aware
from datetime import datetime, timezone
datetime.now(timezone.utc)
```

### Backend: Two Requirements Files

- `backend/requirements.txt` - Full deps for local dev (includes pandas for seeding scripts)
- `backend/api/requirements.txt` - Vercel serverless deps (no pandas, no mangum - must stay under 250 MB)

When adding a new dependency, add to both files unless it's only needed locally.

### Backend: Model Relationship Gotchas

- `ProofOfDelivery` is a **singular object** (`uselist=False`), NOT an array. Access as `order.proof_of_delivery`, not iterating.
- `OrderStatusHistory` uses `timestamp` field, NOT `created_at`. The frontend must reference `entry.timestamp`.
- `Order.status_history` and `Order.proof_of_delivery` both need `selectinload()` when used.

### Frontend: File Upload

Unset Content-Type to let Axios set the multipart boundary:
```typescript
await api.post('/orders/import', formData, { headers: { 'Content-Type': undefined } });
```

### Frontend: Google Maps

- Default to Kuwait City: `lat: 29.3759, lng: 47.9774`
- Use simple `Marker` with SVG data URLs (not `AdvancedMarker` which needs a Map ID)
- `@vis.gl/react-google-maps` for rendering

### Frontend: shadcn/ui Components

Install the Radix UI primitive first, then create the component:
```bash
npm install @radix-ui/react-switch
# Then create frontend/src/components/ui/switch.tsx
```

### Frontend: shadcn/ui Select Empty Values

When using Select with an empty string as a "no selection" option:
```tsx
<SelectItem value="">No driver (assign later)</SelectItem>
```
The empty string is a valid value that clears the selection. Don't use `null` or `undefined`.

### Frontend: Orders Page Date Range Default

The orders page defaults to `'all'` (no date filter) so all orders are visible. Quick-select buttons (Today/Week/Month/All) are available. The selected range is persisted per-user in localStorage. **Do not default to 'today'** — it filters out all historical orders and shows 0 results.

### Frontend: React Query Keys

Optimistic update `queryClient.setQueryData` keys MUST exactly match the `useQuery` `queryKey`. Mismatched keys cause stale data after mutations.

### Docker: Frontend Bakes API URL at Build Time

`npm run build` uses `.env.production` which points to the production Vercel URL. For Docker, the Dockerfile overrides via build arg:
```dockerfile
ARG VITE_API_URL=http://localhost:8000/api/v1
```

### Docker: Run Migrations After DB Reset

The Docker PostgreSQL database does not automatically run Alembic migrations. After `docker compose up -d` or any DB reset, run: `docker exec delivery-system-iii-backend-1 alembic upgrade head`

### Mobile: debugPrint Security

Never log token content. Log length only: `debugPrint('Token attached (${token.length} chars)')`

### Mobile: Foreground Service Notification Channel

Android 8+ (API 26+) requires a valid notification channel before `startForeground()`. The background service in `background_service.dart` uses channel ID `pharmafleet_driver_channel` — this channel is explicitly created in `BackgroundServiceManager.initialize()` via `FlutterLocalNotificationsPlugin` before `_service.configure()`. If the channel doesn't exist, Android throws `CannotPostForegroundServiceNotificationException`. The push notification service (`notification_service.dart`) uses a separate channel `pharmafleet_driver` — these are intentionally different channels with different importance levels.

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host:5444/pharmafleet
SECRET_KEY=<min-32-char-key>
SUPABASE_URL=<url>
SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
REDIS_URL=redis://localhost:6379/0
FIREBASE_CREDENTIALS_JSON=<base64-encoded service account JSON>
CRON_SECRET=<secret-for-cron-endpoints>
SENTRY_DSN=<optional-sentry-dsn>
ENVIRONMENT=production
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_GOOGLE_MAPS_API_KEY=<key>
```

## API Documentation

See `docs/api/` for complete API reference:
- `README.md` - API overview, quick start, response formats
- `AUTHENTICATION.md` - Login flow, token refresh, rate limits, role permissions
- `ERROR_CODES.md` - All error codes with client handling examples
- `PharmaFleet.postman_collection.json` - Importable Postman collection
