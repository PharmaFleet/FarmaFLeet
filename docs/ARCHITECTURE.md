# PharmaFleet - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────┐          ┌──────────────────┐                       │
│    │  Web Dashboard   │          │   Mobile App     │                       │
│    │   (React/Vite)   │          │   (Flutter)      │                       │
│    │                  │          │                  │                       │
│    │  • Manager UI    │          │  • Driver UI     │                       │
│    │  • Analytics     │          │  • Offline Mode  │                       │
│    │  • Real-time Map │          │  • GPS Tracking  │                       │
│    └────────┬─────────┘          └────────┬─────────┘                       │
│             │                              │                                │
└─────────────┼──────────────────────────────┼────────────────────────────────┘
              │ HTTPS                        │ HTTPS
              │                              │
┌─────────────┴──────────────────────────────┴────────────────────────────────┐
│                           CLOUD RUN (GCP)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │                     FastAPI Backend                                 │   │
│    ├────────────────────────────────────────────────────────────────────┤   │
│    │                                                                     │   │
│    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│    │   │   Auth      │  │   Orders    │  │   Drivers   │               │   │
│    │   │   Service   │  │   Service   │  │   Service   │               │   │
│    │   └─────────────┘  └─────────────┘  └─────────────┘               │   │
│    │                                                                     │   │
│    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│    │   │  Analytics  │  │  Payments   │  │ Notifications│               │   │
│    │   │   Service   │  │   Service   │  │   (FCM)     │               │   │
│    │   └─────────────┘  └─────────────┘  └─────────────┘               │   │
│    │                                                                     │   │
│    │   ┌─────────────────────────────────────────────────┐              │   │
│    │   │              WebSocket Handler                   │              │   │
│    │   │         (Real-time Location Updates)             │              │   │
│    │   └─────────────────────────────────────────────────┘              │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Cloud SQL     │  │     Redis       │  │  Cloud Storage  │
│  (PostgreSQL    │  │   (Memorystore) │  │   (POD Images)  │
│   + PostGIS)    │  │                 │  │                 │
│                 │  │  • Cache        │  │  • Signatures   │
│  • Orders       │  │  • Sessions     │  │  • Photos       │
│  • Users        │  │  • Rate Limit   │  │                 │
│  • Drivers      │  │                 │  │                 │
│  • Locations    │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Technology Stack

### Backend

| Component  | Technology             | Purpose                    |
| ---------- | ---------------------- | -------------------------- |
| Framework  | FastAPI (Python 3.11+) | REST API & WebSocket       |
| ORM        | SQLAlchemy (Async)     | Database abstraction       |
| Migrations | Alembic                | Schema versioning          |
| Auth       | JWT (python-jose)      | Token-based authentication |
| Validation | Pydantic               | Request/Response schemas   |

### Frontend (Dashboard)

| Component | Technology               | Purpose                 |
| --------- | ------------------------ | ----------------------- |
| Framework | React 18 + Vite          | Web SPA                 |
| Styling   | Tailwind CSS + shadcn/ui | UI components           |
| State     | Zustand + React Query    | Global state & caching  |
| Maps      | Google Maps JS API       | Driver/warehouse map    |
| Charts    | Recharts                 | Analytics visualization |

### Mobile (Driver App)

| Component | Technology               | Purpose                  |
| --------- | ------------------------ | ------------------------ |
| Framework | Flutter                  | Cross-platform (Android) |
| State     | Provider/Riverpod        | App state management     |
| Local DB  | Hive/SQLite              | Offline storage          |
| Maps      | Google Maps SDK          | Navigation               |
| Push      | Firebase Cloud Messaging | Notifications            |

### Infrastructure (GCP)

| Service       | Purpose                               |
| ------------- | ------------------------------------- |
| Cloud Run     | Serverless container hosting          |
| Cloud SQL     | Managed PostgreSQL + PostGIS          |
| Memorystore   | Managed Redis                         |
| Cloud Storage | POD image storage                     |
| Firebase      | Push notifications & app distribution |

---

## Data Flow

### Order Import Flow

```
Excel File → Dashboard → Import API → Validate → Database → Response
```

### Order Assignment Flow

```
Manager selects order + driver
    ↓
POST /orders/{id}/assign
    ↓
Update order.driver_id
    ↓
Create notification record
    ↓
Send FCM push to driver
    ↓
Mobile app receives notification
```

### Real-time Location Flow

```
Mobile GPS → POST /drivers/location → Database → WebSocket broadcast → Dashboard map
```

### Offline Sync Flow

```
Driver actions locally → Queue in Hive → Connectivity detected → POST /sync/* → Server reconciles
```

---

## Database Schema

See [ERD.md](database/ERD.md) for complete schema.

**Core Entities:**

- `user` - All system users
- `driver` - Driver profile (extends user)
- `warehouse` - Pharmacy locations
- `order` - Delivery orders
- `order_status_history` - Audit trail
- `driver_location` - GPS tracking
- `proof_of_delivery` - Signatures/photos
- `payment_collection` - COD tracking

---

## Security

### Authentication

- JWT tokens with 24h expiry
- Refresh tokens with 7d expiry
- Secure password hashing (bcrypt)

### Authorization

| Role              | Permissions                  |
| ----------------- | ---------------------------- |
| Super Admin       | Full access                  |
| Warehouse Manager | Own warehouse only           |
| Dispatcher        | All warehouses, no user mgmt |
| Executive         | Read-only analytics          |
| Driver            | Own orders only              |

### API Security

- Rate limiting (1000 req/min)
- CORS restricted to known origins
- HTTPS enforced
- Request logging with correlation IDs

---

## Directory Structure

```
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints
│   │   ├── core/         # Config, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   ├── migrations/       # Alembic migrations
│   └── tests/            # Pytest suite
│
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages
│   │   ├── services/     # API clients
│   │   ├── store/        # Zustand stores
│   │   └── hooks/        # Custom hooks
│   └── public/           # Static assets
│
├── mobile/driver_app/
│   ├── lib/
│   │   ├── features/     # Feature modules
│   │   ├── core/         # Shared utilities
│   │   └── l10n/         # Localization
│   └── test/             # Flutter tests
│
└── docs/                 # Documentation
```

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Flutter SDK 3.x
- Docker & Docker Compose

### Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install && npm run dev

# Mobile
cd mobile/driver_app
flutter pub get && flutter run
```

See [README.md](../README.md) for detailed setup.

---

## Deployment

### CI/CD Pipeline (GitHub Actions)

```
Push to main
    ↓
Run tests (pytest, vitest, flutter test)
    ↓
Build Docker image
    ↓
Push to Artifact Registry
    ↓
Deploy to Cloud Run
    ↓
Notify via Discord webhook
```

### Environments

- **Development**: Local Docker Compose
- **Staging**: GCP project `pharmafleet-staging`
- **Production**: GCP project `pharmafleet-prod`

See [ENVIRONMENTS.md](ENVIRONMENTS.md) for configuration.

---

## Monitoring

- **Logs**: Cloud Logging (structured JSON)
- **Metrics**: Cloud Monitoring dashboards
- **Alerts**: CPU > 80%, Error rate > 5%
- **Tracing**: Request correlation IDs

---

## Key Design Decisions

1. **Monorepo**: Single repo for backend, frontend, mobile for easier coordination
2. **Async SQLAlchemy**: Non-blocking DB operations for high concurrency
3. **PostGIS**: Native geospatial queries for location-based features
4. **Redis caching**: Reduce DB load for frequent queries (driver locations)
5. **Offline-first mobile**: Hive local storage with sync queue
6. **WebSocket for real-time**: Efficient push for live map updates
