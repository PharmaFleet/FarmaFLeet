# PharmaFleet

PharmaFleet is a comprehensive delivery management system designed to streamline pharmacy delivery operations in Kuwait. It provides a centralized platform for dispatchers and managers to coordinate deliveries while empowering drivers with a mobile application for efficient route execution.

## 🚀 Overview

The system replaces manual, Excel-based workflows with a digital solution that offers:

- **Real-time Visibility:** Track driver locations and order status live on a map.
- **Efficient Assignment:** Drag-and-drop or batch assignment of orders to drivers.
- **Digital Proof of Delivery:** Capture signatures and photos directly from the driver app.
- **Offline Capabilities:** Drivers can continue working in areas with poor connectivity.
- **Analytics:** Data-driven insights into delivery performance and driver efficiency.

## 🛠 Tech Stack

### Backend

- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL with PostGIS (via GeoAlchemy2)
- **Caching:** Redis
- **ORM:** SQLAlchemy (Async)
- **Migrations:** Alembic
- **Testing:** Pytest

### Frontend (Web Dashboard)

- **Framework:** React (Vite)
- **Styling:** Tailwind CSS, Radix UI (shadcn/ui)
- **State Management:** Zustand, React Query
- **Maps:** Google Maps API
- **Charts:** Recharts

### Mobile (Driver App)

- **Framework:** Flutter (Android)
- **State Management:** Provider/Riverpod (Implied standard)
- **Maps:** Google Maps SDK

### DevOps

- **Containerization:** Docker & Docker Compose
- **CI/CD:** GitHub Actions

## 📂 Project Structure

```bash
├── backend/            # FastAPI application
│   ├── app/            # Application logic (api, models, schemas, services)
│   ├── migrations/     # Database migrations
│   └── tests/          # Pytest suite
├── frontend/           # React Admin Dashboard
│   ├── src/            # Components, pages, hooks, store
│   └── public/         # Static assets
├── mobile/             # Flutter Driver Application
│   └── driver_app/     # Main flutter project
├── docs/               # Documentation (ERD, Design Specs)
└── docker-compose.yml  # Container orchestration
```

## ⚡ Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Flutter SDK
- Docker & Docker Compose (Optional but recommended)
- PostgreSQL & Redis (if running locally without Docker)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure Environment
cp .env.example .env
# Edit .env with your database credentials

# Run Migrations
alembic upgrade head

# Start Server
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Configure Environment
cp .env.example .env

# Start Development Server
npm run dev
```

### 3. Mobile App Setup

```bash
cd mobile/driver_app
flutter pub get
flutter run
```

### 4. Running with Docker

To start the entire stack (Backend + Database + Redis) using Docker:

```bash
docker-compose up -d --build
```

## 🧪 Testing

The project includes a comprehensive testing suite for both backend and frontend.

### Frontend E2E (Playwright)

```bash
cd frontend
npx playwright test
```

_Note: Our Playwright tests are optimized for HashRouter and multi-browser compatibility (Chromium, Firefox, WebKit)._

### Backend Tests (Pytest)

```bash
cd backend
pytest
```

For more details on testing strategies, HashRouter patterns, and environment setup, see the **[Testing Guide](docs/TESTING.md)**.

## 📖 Documentation

- **[Product Requirements (PRD)](prd.md):** Detailed breakdown of features and user stories.
- **[Development Plan](plan.md):** Project milestones and task tracking.
- **[Testing Guide](docs/TESTING.md):** E2E and Backend testing best practices.
- **[API Reference](docs/API_REFERENCE.md):** Complete endpoint documentation.
- **[Database Schema](docs/database/ERD.md):** Entity Relationship Diagram.
- **[Architecture Overview](docs/ARCHITECTURE.md):** System design and tech stack.
- **[Manager Manual](docs/MANAGER_MANUAL.md):** Dashboard user guide.
- **[Driver Guide](docs/DRIVER_GUIDE.md):** Mobile app quick reference.
- **[Environments](docs/ENVIRONMENTS.md):** Configuration and deployment guides.

## ✨ Key Features

### Manager Dashboard

- **Order Import:** Bulk upload orders via Excel with duplicate detection.
- **Smart Assignment:** Assign orders to drivers based on location and availability.
- **Live Tracking:** Real-time map view of all active drivers and deliveries.
- **Performance Analytics:** Dashboards for delivery success rates, times, and volume.

### Driver App

- **My Tasks:** Clear list of assigned deliveries with optimized routing.
- **Navigation:** One-tap navigation to customer locations via Google Maps.
- **Proof of Delivery:** Digital signature and photo capture.
- **Offline Mode:** Full functionality persists without internet access.

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request
