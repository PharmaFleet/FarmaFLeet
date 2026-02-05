# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PharmaFleet is a delivery management system for pharmacy operations in Kuwait. Three applications:
- **Backend**: FastAPI (Python) with async SQLAlchemy + PostgreSQL (Supabase) + Redis
- **Frontend**: React (Vite) + shadcn/ui + React Query + Zustand
- **Mobile**: Flutter Android driver app with BLoC pattern + offline-first

Orders are imported from Microsoft Dynamics 365 Excel exports. Drivers are assigned manually (managers prefer control over algorithms). UI is bilingual (English/Arabic).

## Production Deployment

**URL**: https://pharmafleet-olive.vercel.app

- Frontend: Static build at root (`/`)
- Backend: Python serverless at `/api/*` via `backend/api/index.py` (native FastAPI support, no Mangum)
- Database: Supabase PostgreSQL with PgBouncer (requires `statement_cache_size=0`)
- Storage: Supabase Storage for proof of delivery images
- Push to `main` triggers automatic deployment

```bash
# Run migrations on production
vercel env pull .env.vercel --environment=production
cd backend
python -c "
import os
os.environ['DATABASE_URL'] = '<DATABASE_URL from .env.vercel>'
os.environ['SECRET_KEY'] = '<SECRET_KEY from .env.vercel>'
from alembic.config import Config
from alembic import command
command.upgrade(Config('alembic.ini'), 'head')
"
```

## Development Commands

### Backend
```bash
cd backend
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Tests
pytest                                          # All tests
pytest tests/test_orders.py::test_create_order -v  # Single test
pytest --cov=app --cov-report=term-missing      # Coverage

# Lint (note: pyproject.toml configures black at line-length=88)
flake8 app/ --max-line-length=100
black app/
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
flutter run
flutter build apk --release
flutter test
```

### Docker (full stack)
```bash
# On Linux/macOS (Makefile available):
make dev          # Start all services
make db-reset     # Drop, recreate, migrate, seed
make db-migrate   # Run alembic migrations inside container
make test         # Backend tests
make logs-backend # View backend logs

# On Windows (no make), use docker compose directly:
docker compose up -d                                          # Start all services
docker compose down                                           # Stop all services
docker exec delivery-system-iii-backend-1 alembic upgrade head  # Run migrations
docker logs delivery-system-iii-backend-1 --tail 50           # View backend logs
docker compose restart backend                                # Restart after code changes
```

**Docker port mapping**: Backend container listens on 8080 (mapped to host 8000). Frontend nginx on 80 (mapped to host 3000). DB on 5432 (mapped to host 5444).

### Seeding Scripts
```bash
cd backend
python scripts/seed_superadmin.py   # Create admin user
python scripts/seed_accounts.py     # Seed from accounts.xlsx
python scripts/seed_warehouses.py   # Seed warehouses from Excel
```

## Architecture Patterns

### Backend: Async SQLAlchemy with `lazy='raise'`

All models use `lazy='raise'` on relationships. This means relationships **must** be eagerly loaded or they raise an error:

```python
# WRONG - raises error
driver = await db.get(Driver, driver_id)
driver.user  # raises!

# CORRECT - use selectinload
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
warehouse_ids = await get_user_warehouse_ids(db, current_user)
if warehouse_ids is not None:
    query = query.where(Order.warehouse_id.in_(warehouse_ids))
```

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

### Frontend: HashRouter + Polling Architecture

- Uses `HashRouter` (`/#/` URLs) for Vercel static hosting compatibility
- **WebSocket is disabled on Vercel** (commented out in MapView.tsx). All real-time data uses HTTP polling:
  - Map: polls `/drivers/locations` every 5 seconds
  - Dashboard: 30-second `refetchInterval` via React Query
  - Analytics: 60-second interval
- Mobile sends location via HTTP POST to `/drivers/location` (singular); frontend fetches from `/drivers/locations` (plural)

### Backend: Batch Operations Pattern

Batch endpoints use bulk fetch with dict map lookup to avoid N+1 queries:

```python
# Fetch all orders in one query
result = await db.execute(select(Order).where(Order.id.in_(request.order_ids)))
orders_map = {o.id: o for o in result.scalars().all()}

# Then iterate with O(1) lookups
for order_id in request.order_ids:
    order = orders_map.get(order_id)
    if not order:
        errors.append({"order_id": order_id, "error": "Order not found"})
        continue
```

All batch error responses use the standard format: `{"order_id": <id>, "error": "<message>"}`.

### Mobile: Offline-First + Token Refresh

- Hive for local persistence, queued actions sync when online via `/sync` endpoints
- BLoC pattern (flutter_bloc) for state management
- Background location tracking continues when app is backgrounded
- 3-tab order structure: Assigned → Active (picked_up/in_transit/out_for_delivery) → History
- **Token refresh flow**: On 401, `DioClient` attempts `POST /auth/refresh` before logout. Uses a separate Dio instance for the refresh call to avoid interceptor loops. `_isRefreshing` flag prevents concurrent refresh attempts.

## Database

PostgreSQL with PostGIS. Migrations via Alembic.
- **Alembic autogenerate requires a live DB connection** - create migrations manually when DB is unavailable
- Key tables: users, drivers, orders, order_status_history, proof_of_delivery, warehouses, notifications, payment_collections, driver_locations
- Warehouse codes from Excel imports (DW001-DW010, BV001-BV004, CCB01) - always display `warehouse.code`, not `warehouse_id`
- `backend/app/db/session.py` auto-detects `VERCEL` env var for serverless pool settings (pool_size=1, statement_cache_size=0)

## Key Business Rules

- **Manual assignment**: No auto-assignment. Managers know their drivers and areas.
- **24-hour archive buffer**: Delivered orders get `delivered_at` set, NOT `is_archived = True`. Orders stay in "Delivered" tab for 24h, then `/auto-archive` cron moves them to archive.
- **POD optional**: Proof of delivery (photo/signature) is optional when completing deliveries.
- **Order statuses**: pending → assigned → picked_up → in_transit → out_for_delivery → delivered/rejected/returned/cancelled
- **Five roles**: super_admin, warehouse_manager, dispatcher, executive, driver
- **Batch operations**: Bulk assign, cancel, delete, pickup, delivery, return in `orders.py`
- **Column rename**: `sales_track` was renamed to `sales_taker` (migration `c8f3a1b2d4e5`). Use `sales_taker` everywhere.
- **Driver code**: Defaults to `biometric_id` when not explicitly provided. Unique constraint on `code` column.

## Testing

Backend tests use **SQLite in-memory** (no Docker/PostgreSQL required). `conftest.py` patches GeoAlchemy2 and JSONB types for SQLite compatibility. Redis is fully mocked. `asyncio_mode = "auto"` in `pyproject.toml`.

**Caveat**: Tests using the sync `client` fixture (TestClient) must be sync functions (`def test_...`), not `async def`. Mixing `async def` with the sync fixture causes event loop scope conflicts.

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

### Docker: Backend Doesn't Auto-Reload

The backend Dockerfile uses `--workers 4` (production mode) without `--reload`. After editing backend code, restart the container: `docker compose restart backend`

### Docker: Frontend Bakes API URL at Build Time

`npm run build` uses `.env.production` which points to the production Vercel URL. For Docker, the Dockerfile overrides this via build arg:
```dockerfile
ARG VITE_API_URL=http://localhost:8000/api/v1
```
If you rebuild the frontend image, ensure this arg is set correctly or the frontend will try to call the production API.

### Docker: Run Migrations After DB Reset

The Docker PostgreSQL database does not automatically run Alembic migrations. After `docker compose up -d` or any DB reset, run: `docker exec delivery-system-iii-backend-1 alembic upgrade head`

### Backend: Model Relationship Gotchas

- `ProofOfDelivery` is a **singular object** (`uselist=False`), NOT an array. Access as `order.proof_of_delivery`, not iterating.
- `OrderStatusHistory` uses `timestamp` field, NOT `created_at`. The frontend must reference `entry.timestamp`.
- `Order.status_history` and `Order.proof_of_delivery` both need `selectinload()` when used.

### Frontend: React Query Keys

Optimistic update `queryClient.setQueryData` keys MUST exactly match the `useQuery` `queryKey`. Mismatched keys cause stale data after mutations.

### Mobile: debugPrint Security

Never log token content. Log length only: `debugPrint('Token attached (${token.length} chars)')`

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host:5444/pharmafleet
SECRET_KEY=<strong-key>
SUPABASE_URL=<url>
SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
REDIS_URL=redis://localhost:6379/0
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_GOOGLE_MAPS_API_KEY=<key>
```
