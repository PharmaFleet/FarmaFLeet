# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PharmaFleet is a delivery management system for pharmacy operations in Kuwait. The system consists of three main applications:
- **Backend**: FastAPI (Python) with PostgreSQL and Redis
- **Frontend**: React (Vite) web dashboard for managers
- **Mobile**: Flutter Android app for drivers

The system handles order import from Excel, manual driver assignment, real-time tracking, offline capabilities, and proof of delivery.

## Production Deployment

**URL**: https://pharmafleet-olive.vercel.app

### Vercel Configuration
- Frontend: Static build served at root (`/`)
- Backend: Python serverless at `/api/*` via `backend/api/index.py`
- Vercel has **native FastAPI support** - no Mangum wrapper needed
- Database uses **Supabase with PgBouncer** - requires `statement_cache_size=0`

### Production Database Access
```bash
# Pull production env vars
vercel env pull .env.vercel --environment=production

# Run migrations on production
cd backend
DATABASE_URL="<from-vercel-env>" alembic upgrade head
```

### Serverless Considerations
- `backend/app/db/session.py` auto-detects `VERCEL` env var for serverless-optimized settings
- Pool size is reduced to 1 for serverless, statement caching disabled for PgBouncer

## Development Commands

### Using Make (Recommended)

```bash
# Start all services with Docker
make dev

# View logs
make logs              # All services
make logs-backend      # Backend only
make logs-frontend     # Frontend only

# Database operations
make db-migrate        # Run migrations
make db-seed           # Seed test data
make db-reset          # Drop, recreate, migrate, and seed
make db-shell          # Open PostgreSQL shell

# Testing
make test              # Run backend tests
make test-coverage     # Run tests with coverage

# Utilities
make status            # Show container status
make restart-backend   # Restart backend only
make clean             # Stop and remove all containers
```

### Backend (FastAPI)

```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run server
uvicorn app.main:app --reload

# Run tests
pytest                 # All tests
pytest tests/ -v -m "not integration"  # Unit tests only
pytest tests/ -v -m integration        # Integration tests only
pytest tests/test_orders.py -v         # Single file
pytest tests/test_orders.py::test_create_order -v  # Single test
pytest --cov=app --cov-report=term-missing  # With coverage

# Linting and formatting
flake8 app/ --max-line-length=100
black app/ --line-length=100
```

### Frontend (React)

```bash
cd frontend

# Setup
npm install

# Development
npm run dev            # Start dev server (port 3000)

# Build
npm run build          # Production build
npm run preview        # Preview production build

# Testing
npm run test           # Unit tests (Vitest)
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
npm test -- OrdersPage.test.tsx        # Single test file
npm run test:e2e       # E2E tests (Playwright)
npm run test:e2e:ui    # Playwright UI mode

# Linting
npm run lint
```

### Mobile (Flutter)

```bash
cd mobile/driver_app

# Setup
flutter pub get

# Run
flutter run

# Build
flutter build apk --debug      # Debug APK
flutter build apk --release    # Release APK

# Testing
flutter test                   # Unit tests
flutter test integration_test  # Integration tests

# Code generation (for models/serialization)
flutter pub run build_runner build --delete-conflicting-outputs
```

### Backend Scripts

Utility scripts in `backend/scripts/` for common operations:

```bash
cd backend

# Database seeding
python scripts/seed_superadmin.py      # Create admin user
python scripts/seed_accounts.py        # Seed from accounts.xlsx (drivers, managers, warehouses)
python scripts/seed_warehouses.py      # Seed warehouse data from Excel

# Debugging
python scripts/check_users.py          # List all users
python scripts/check_driver.py         # Check driver status
python scripts/list_users.py           # List users with details

# Maintenance
python scripts/reset_driver_status.py  # Reset all drivers to offline
python scripts/fix_data.py             # Fix data inconsistencies
```

## Architecture

### Backend Structure

The backend follows a clean architecture pattern with clear separation of concerns:

```
backend/app/
├── api/v1/
│   ├── api.py              # Main API router aggregation
│   └── endpoints/          # Individual endpoint modules
│       ├── login.py        # Authentication
│       ├── users.py        # User management
│       ├── drivers.py      # Driver operations
│       ├── orders.py       # Order CRUD and assignment
│       ├── payments.py     # Payment tracking
│       ├── analytics.py    # Reports and metrics
│       ├── notifications.py # Push notifications
│       ├── warehouses.py   # Warehouse operations
│       ├── sync.py         # Offline sync endpoints
│       └── upload.py       # File upload (Excel, images)
├── core/
│   ├── config.py           # Settings and environment variables
│   ├── security.py         # JWT and password hashing
│   └── logging.py          # Logging configuration
├── db/
│   └── session.py          # Async SQLAlchemy session management
├── models/                 # SQLAlchemy ORM models
│   ├── user.py
│   ├── driver.py
│   ├── order.py
│   ├── location.py
│   ├── warehouse.py
│   ├── notification.py
│   └── financial.py
├── schemas/                # Pydantic schemas for request/response validation
├── services/               # Business logic layer
└── routers/                # WebSocket routers
    └── websocket.py        # Real-time location updates
```

**Key architectural decisions:**
- **Async everywhere**: Uses async/await with asyncpg and AsyncSession
- **JWT authentication**: Access tokens expire in 2 hours (improved from 8 days for security)
- **Role-based access**: Five roles (super_admin, warehouse_manager, dispatcher, executive, driver)
- **User fields**: email, full_name, phone, role, fcm_token (for push notifications)
- **Supabase Storage**: Used for proof of delivery images (signatures, photos)
- **WebSocket**: Real-time driver location updates (authenticated, 60-second adaptive intervals)
- **Offline sync**: `/sync` endpoint handles queued actions from offline drivers
- **Warehouse isolation**: Users can only access orders from their assigned warehouses

### Frontend Structure

React SPA with HashRouter for Vercel compatibility:

```
frontend/src/
├── components/
│   ├── analytics/      # Charts and KPI widgets
│   ├── dashboard/      # Dashboard-specific components
│   ├── drivers/        # Driver management UI
│   ├── maps/           # Google Maps integration
│   ├── orders/         # Order list, filters, assignment
│   ├── shared/         # Reusable components
│   └── ui/             # shadcn/ui primitives (Button, Dialog, etc.)
├── pages/              # Route components
│   ├── auth/           # Login page
│   ├── dashboard/      # Main dashboard
│   ├── orders/         # Order management
│   ├── drivers/        # Driver management
│   ├── analytics/      # Reports and analytics
│   ├── map/            # Live tracking map
│   ├── payments/       # Payment tracking
│   ├── settings/       # User settings
│   └── users/          # User management
├── stores/             # Zustand state management
│   ├── analyticsStore.ts
│   └── driversStore.ts
├── services/           # API client functions
├── hooks/              # Custom React hooks
└── types/              # TypeScript type definitions
```

**Key architectural decisions:**
- **HashRouter**: Uses `/#/` URLs for Vercel static hosting compatibility
- **Zustand**: Lightweight state management for analytics and drivers
- **React Query**: Server state caching and synchronization
- **shadcn/ui**: Headless component library built on Radix UI
- **Google Maps**: `@vis.gl/react-google-maps` for map rendering

### Mobile Structure

Flutter app with BLoC pattern and offline-first architecture:

```
mobile/driver_app/lib/
├── core/
│   ├── network/            # Dio HTTP client with JWT interceptor
│   └── services/
│       ├── token_storage_service.dart    # Secure token storage
│       ├── location_service.dart         # GPS tracking
│       ├── file_upload_service.dart      # Image compression/upload
│       ├── sync_service.dart             # Offline queue management
│       └── local_database_service.dart   # Hive persistence
├── features/
│   ├── auth/
│   │   ├── data/           # API repositories
│   │   ├── domain/         # Business logic
│   │   └── presentation/   # BLoC + Screens
│   ├── orders/             # Order list and status updates
│   ├── delivery/           # Proof of delivery (signature/photo)
│   ├── home/               # Dashboard with online/offline toggle
│   └── settings/           # App settings
├── theme/                  # Material Design 3 theme
├── widgets/                # Reusable widgets
└── l10n/                   # Localization (English, Arabic)
```

**Key architectural decisions:**
- **BLoC pattern**: flutter_bloc for predictable state management
- **Offline-first**: Hive for local persistence, queued actions sync when online
- **Background services**: Location tracking continues when app is backgrounded
- **Firebase**: FCM for push notifications to drivers
- **Image compression**: flutter_image_compress before upload to save bandwidth
- **Dependency injection**: get_it with injectable for clean architecture

## Database

PostgreSQL with PostGIS extension for spatial data:
- **Connection pooling**: Managed by SQLAlchemy AsyncEngine
- **Migrations**: Alembic for version control
- **Key tables**: users, drivers, orders, locations, warehouses, notifications, financial_transactions
- **Spatial queries**: Uses PostGIS for distance calculations and geographic queries

## Environment Configuration

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host:5444/pharmafleet
SECRET_KEY=<generate-strong-key>
SUPABASE_URL=<supabase-project-url>
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-key>
REDIS_URL=redis://localhost:6379/0
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_GOOGLE_MAPS_API_KEY=<google-maps-key>
```

### Mobile (android/local.properties + environment)
- Firebase config in `google-services.json`
- Google Maps API key in `AndroidManifest.xml`

## Testing Strategy

### Backend
- **Unit tests**: Business logic in `services/`
- **Integration tests**: API endpoints with test database
- **Fixtures**: Pytest fixtures for test data
- **Coverage target**: Aim for >80% on critical paths

### Frontend
- **Unit tests**: Vitest for components and hooks
- **E2E tests**: Playwright for user flows
- **HashRouter compatibility**: Tests use `MemoryRouter` or wait for `/#/` URLs
- **MSW**: Mock Service Worker for API mocking

### Mobile
- **Widget tests**: Flutter test framework
- **Integration tests**: Full app flow tests
- **Golden tests**: Not currently implemented

## Deployment

- **Production**: Deployed to Vercel (frontend + serverless backend) at https://pharmafleet-olive.vercel.app
- **Database**: Supabase PostgreSQL with PgBouncer pooling
- **Storage**: Supabase Storage for proof of delivery images
- **Mobile**: APK distributed via Google Play Store or enterprise distribution

### Vercel Deployment Notes
- Push to `main` triggers automatic deployment
- Backend entry point: `backend/api/index.py` (exposes FastAPI `app` directly)
- Environment variables must be set in Vercel dashboard (DATABASE_URL, SECRET_KEY, REDIS_URL, SUPABASE_*)
- After adding new model fields, run migrations on production database manually

## Common Workflows

### Adding a New API Endpoint
1. Create model in `backend/app/models/`
2. Create schema in `backend/app/schemas/`
3. Create endpoint in `backend/app/api/v1/endpoints/`
4. Register router in `backend/app/api/v1/api.py`
5. Run migration: `alembic revision --autogenerate -m "description"`
6. Apply: `alembic upgrade head`

### Adding a New Frontend Page
1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Create API service function in `frontend/src/services/`
4. Add navigation link in `frontend/src/components/layout/`
5. Update TypeScript types in `frontend/src/types/`

### Adding a New Mobile Feature
1. Create feature folder in `mobile/driver_app/lib/features/`
2. Implement data layer (repository)
3. Implement domain layer (use cases)
4. Implement presentation layer (BLoC + screens)
5. Register in dependency injection (`config/di.dart`)

## Git Workflow

- **Main branch**: `main` (production)
- **Development branch**: `develop` (staging)
- **Feature branches**: `feature/description`
- **Bug fixes**: `fix/description`
- **Commit convention**: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)

## Important Notes

- **Excel import**: Orders are imported from Microsoft Dynamics 365 exports; no direct integration
- **Manual assignment**: No auto-assignment algorithms; managers prefer manual control
- **Kuwait-specific**: UI designed for Kuwait geography, bilingual (English/Arabic)
- **Offline critical**: Drivers work in areas with poor connectivity; offline mode is essential
- **Security**: Never commit `.env` files, API keys, or service account credentials
- **Batch operations**: Bulk assign, cancel, and delete are in `orders.py` - batch routes must come BEFORE `/{order_id}` routes to avoid shadowing
- **Auto-archive**: Orders automatically archive when status becomes DELIVERED
