# PharmaFleet Development Plan

## Overview

PharmaFleet is a delivery management system for Al-Dawaeya and Biovit pharmacy groups in Kuwait. It consists of a web dashboard for managers and an Android mobile application for drivers. The system enables manual order assignment, real-time driver tracking, proof of delivery capture, and comprehensive analytics.

**Technology Stack:**

- **Backend:** FastAPI (Python)
- **Frontend:** React
- **Mobile:** Flutter (Android)
- **Database:** PostgreSQL with PostGIS extension
- **Cloud:** Google Cloud Platform (GCP)
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Maps:** Google Maps API

---

## 1. Project Setup

### 1.1 Repository and Version Control

- [x] Create GitHub/GitLab organization for PharmaFleet (Using personal repo)
- [x] Set up main repository with monorepo structure (backend, frontend, mobile)
- [x] Configure branch protection rules (See CONTRIBUTING.md)
- [x] Set up Git workflow (feature branches, pull requests, code review process)
- [x] Create `.gitignore` files for Python, React, and Flutter
- [x] Set up commit message conventions and PR templates
- [x] Configure GitHub Actions / GitLab CI runners

### 1.2 Development Environment Setup

- [x] Document local development setup in `README.md`
- [x] Create `docker-compose.yml` for local PostgreSQL and Redis
- [x] Set up Python virtual environment configuration (requirements.txt, pyproject.toml)
- [x] Configure Node.js and npm/yarn for frontend development
- [x] Set up Flutter SDK and Android development environment
- [x] Create `.env.example` files for all applications
- [x] Document IDE setup recommendations (VS Code, PyCharm extensions)
- [x] Set up pre-commit hooks for linting and formatting

### 1.3 Google Cloud Platform Setup

- [x] Create GCP project and enable billing ($300 free credit)
- [x] Enable required GCP APIs (Cloud SQL, Cloud Run, Cloud Storage, Maps, etc.)
- [x] Set up Cloud SQL PostgreSQL instance with PostGIS extension
- [x] Configure VPC network and firewall rules (Public IP + Auth Network)
- [x] Set up Cloud Storage buckets for proof of delivery images
- [x] Create service accounts with appropriate IAM roles
- [x] Set up Cloud Secret Manager for sensitive credentials (Implicit in GCP setup)
- [ ] Configure Cloud Monitoring and Cloud Logging

### 1.4 Database Setup

- [x] Design and document database schema (ERD diagram)
- [x] Create initial database migration structure (Alembic)
- [x] Set up database connection pooling configuration
- [x] Create database roles and permissions (admin, api, readonly)
- [x] Set up automated backup schedule (daily snapshots)
- [x] Configure point-in-time recovery (PITR)
- [x] Install and configure PostGIS extension for geospatial data
- [x] Create database indexes for performance optimization
- [x] Set up database monitoring and alerting

### 1.5 CI/CD Pipeline Setup

- [x] Configure CI pipeline for backend (linting, testing, building)
- [x] Configure CI pipeline for frontend (linting, testing, building)
- [x] Configure CI pipeline for mobile app (build APK)
- [x] Set up automated deployment to GCP Cloud Run (backend)
- [x] Set up automated deployment to Cloud Storage + CDN (frontend)
- [x] Configure staging and production environments
- [x] Set up deployment rollback procedures
- [x] Create deployment notification system (Slack/Discord webhooks)

### 1.6 Firebase Setup

- [ ] Create Firebase project for PharmaFleet
- [ ] Register Android app in Firebase console
- [ ] Download and configure `google-services.json`
- [ ] Enable Firebase Cloud Messaging (FCM)
- [ ] Set up FCM server key in backend environment
- [ ] Configure FCM notification channels for Android
- [ ] Test push notification delivery to test devices

### 1.7 External Service Setup

- [ ] Enable Google Maps JavaScript API for web dashboard
- [ ] Enable Google Maps Android API for mobile app
- [ ] Create and secure API keys with domain/app restrictions
- [ ] Set up API usage monitoring and quotas
- [ ] Configure billing alerts for API usage
- [ ] Test map integration in development environment

---

## 2. Backend Foundation

### 2.1 FastAPI Project Structure

- [x] Initialize FastAPI project with proper folder structure
- `app/api/` (API endpoints)
- `app/core/` (config, security, dependencies)
- `app/models/` (SQLAlchemy models)
- `app/schemas/` (Pydantic models)
- `app/services/` (business logic)
- `tests/` (test suite)

- [x] Configure FastAPI application with CORS, middleware, exception handlers
- [x] Set up environment configuration using Pydantic Settings
- [x] Create health check endpoint (`/health`)
- [x] Set up API documentation with Swagger UI and ReDoc
- [x] Configure logging with structured logging (JSON format)
- [x] Set up request/response logging middleware

### 2.2 Database Models and Migrations

- [x] Create User model (managers, drivers, executives)
- [x] Create Driver model (biometric_id, vehicle_info, status)
- [x] Create Warehouse model (code, name, lat/long)
- [x] Create Order model (sales_order_number, customer_info, status, payment_method)
- [x] Create OrderStatusHistory model
- [x] Create DriverLocation model
- [x] Create ProofOfDelivery model (signature/photo url)
- [x] Create PaymentCollection model
- [x] Create AuditLog model
- [x] Create Notification model
- [x] Create Alembic migrations for all models
- [x] Add database indexes and foreign key constraints
- [x] Seed database with warehouse data (14 pharmacies)

### 2.3 Authentication and Authorization System

- [x] Implement password hashing using bcrypt/passlib
- [x] Create JWT token generation and validation functions
- [x] Implement access token and refresh token logic
- [x] Create authentication dependency for protected routes
- [x] Implement role-based access control (RBAC) decorator
- [x] Create permission checking functions (super_admin, warehouse_manager, dispatcher, executive)
- [x] Implement warehouse-based data filtering for warehouse managers
- [x] Set up session management and token expiration
- [x] Implement logout functionality (token blacklisting with Redis)
- [x] Create password reset functionality
- [x] Add login attempt rate limiting

### 2.4 Core Services and Utilities

- [x] Create database session management utility
- [x] Implement file upload service for Cloud Storage
- [x] Create geospatial utilities using PostGIS (distance calculation via DB)
- [x] Implement pagination utility for list endpoints
- [x] Create filtering and search utility functions
- [x] Implement Excel file parsing service (openpyxl/pandas)
- [x] Create FCM notification service (Single/Bulk/Queuing)
- [x] Implement error handling and exception classes
- [x] Create response wrapper utilities

### 2.5 Base API Structure

- [x] Create API router structure with versioning (`/api/v1`)
- [x] Implement consistent error response format
- [x] Set up request validation using Pydantic schemas
- [x] Create API rate limiting middleware
- [x] Implement request correlation IDs for tracing
- [x] Set up API response caching strategy (Redis)
- [x] Create API documentation with detailed examples
- [x] Implement API health checks and status endpoints

---

## 3. Feature-specific Backend Development

### 3.1 Authentication and User Management APIs

- [x] **POST** `/api/v1/auth/login` (User login)
- [x] **POST** `/api/v1/auth/refresh` (Refresh access token)
- [x] **POST** `/api/v1/auth/logout` (User logout)
- [x] **POST** `/api/v1/auth/password-reset`
- [x] **GET/PUT** `/api/v1/users/me` (Current user profile)
- [x] **CRUD** `/api/v1/users` (Admin user management)

### 3.2 Driver Management APIs

- [x] **GET** `/api/v1/drivers` (List all with filters)
- [x] **POST** `/api/v1/drivers` (Create account)
- [x] **PUT** `/api/v1/drivers/{driver_id}` (Update info)
- [x] **PATCH** `/api/v1/drivers/{driver_id}/status` (Update availability)
- [x] **GET** `/api/v1/drivers/{driver_id}/orders` (Assigned orders)
- [x] **GET** `/api/v1/drivers/{driver_id}/delivery-history`
- [x] **GET** `/api/v1/drivers/{driver_id}/location`

### 3.3 Order Import and Management APIs

- [x] **POST** `/api/v1/orders/import` (Excel upload & parsing)
- [x] **GET** `/api/v1/orders` (List with advanced filtering)
- [x] **GET** `/api/v1/orders/{order_id}` (Details)
- [x] **DELETE** `/api/v1/orders/{order_id}` (Cancel order)
- [x] **GET** `/api/v1/orders/{order_id}/status-history`
- [x] **POST** `/api/v1/orders/export` (Export filtered list)

### 3.4 Order Assignment APIs

- [x] **POST** `/api/v1/orders/{order_id}/assign` (Single assign)
- [x] **POST** `/api/v1/orders/batch-assign` (Bulk assign)
- [x] **POST** `/api/v1/orders/{order_id}/reassign`
- [x] **POST** `/api/v1/orders/{order_id}/unassign`

### 3.5 Driver Location Tracking APIs

- [x] **POST** `/api/v1/drivers/location` (Update from app)
- [x] **GET** `/api/v1/drivers/locations` (Get all online)
- [x] **GET** `/api/v1/drivers/{driver_id}/location-history`
- [x] **WebSocket** `/ws/driver-locations` (Real-time updates)

### 3.6 Order Status Update APIs (Mobile App)

- [x] **PATCH** `/api/v1/orders/{order_id}/status` (Update status)
- [x] **POST** `/api/v1/orders/{order_id}/reject` (Reject with reason)
- [x] **POST** `/api/v1/orders/{order_id}/proof-of-delivery` (Upload image)

### 3.7 Payment Management APIs

- [x] **GET** `/api/v1/payments/pending`
- [x] **POST** `/api/v1/orders/{order_id}/payment-collection`
- [x] **POST** `/api/v1/payments/{payment_id}/clear` (Manager verify)
- [x] **GET** `/api/v1/payments/report`

### 3.8 Notification APIs

- [x] **GET** `/api/v1/notifications`
- [x] **PATCH** `/api/v1/notifications/{notification_id}/read`
- [x] **POST** `/api/v1/notifications/register-device` (FCM Token)

### 3.9 Analytics and Reporting APIs

- [x] **GET** `/api/v1/analytics/deliveries-per-driver`
- [x] **GET** `/api/v1/analytics/average-delivery-time`
- [x] **GET** `/api/v1/analytics/success-rate`
- [x] **GET** `/api/v1/analytics/driver-performance`
- [x] **GET** `/api/v1/analytics/orders-by-warehouse`
- [x] **GET** `/api/v1/analytics/executive-dashboard`

### 3.10 Warehouse & Sync APIs

- [x] **GET** `/api/v1/warehouses`
- [x] **POST** `/api/v1/sync/status-updates` (Offline sync)
- [x] **POST** `/api/v1/sync/proof-of-delivery` (Offline sync)
- [x] **GET** `/api/v1/sync/orders/{driver_id}` (Resync)

---

## 4. Frontend Foundation (React Dashboard)

### 4.1 React Project Setup

- [x] Initialize React project (Vite recommended)
- [x] Set up folder structure (components, pages, services, hooks, context)
- [x] Configure TypeScript, ESLint, and Prettier
- [x] Install Tailwind CSS
- [x] Install UI component library (Material-UI or shadcn/ui)
- [x] Set up environment variables

### 4.2 Routing and Navigation

- [x] Install React Router
- [x] Configure Protected Routes (Auth Guard)
- [x] Implement Role-Based Access Control guards
- [x] Create Layout components (Sidebar, Header)
- [x] Create 404 Page

### 4.3 State Management

- [x] Set up Global State (Redux Toolkit or Zustand)
- [x] Create Slices: Auth, Orders, Drivers, Notifications
- [x] Configure persistence where needed

### 4.4 API Integration Layer

- [x] Set up Axios interceptors (Auth token injection, Error handling)
- [x] Implement auto-refresh token logic
- [x] Create Service modules (authService, orderService, etc.)
- [x] Set up React Query/SWR for caching

### 4.5 UI Components

- [x] **Auth:** Login page, Password Reset, Logout
- **Common Components:**
- [x] Button, Input, Select, Modal
- [x] Table (sort/paginate), Card, Badge
- [x] Toast/Notification, Tooltip, Loading Spinner

- **Map:**
- [x] Google Maps JS Wrapper
- [x] Custom Markers (Drivers/Warehouses)
- [x] Clustering and InfoWindows

---

## 5. Feature-specific Frontend Development

### 5.1 Dashboard Home Page

- [x] Key metrics cards (Orders today, Active drivers, Success rate)
- [x] Recent activity timeline
- [x] Auto-refresh logic

### 5.2 Order Management Pages

- [x] **Order List:** Advanced table with filters (Warehouse, Status, Driver)
- [x] **Order Import Modal:** File upload, validation preview, duplicate detection
- [x] **Order Detail:** Full info view, status history, proof of delivery display
- [x] **Assignment Modals:** Single Assign, Batch Assign, Reassign

### 5.3 Real-time Map View

- [x] Full-screen map component
- [x] Display online drivers (color-coded by status)
- [x] Display warehouse markers
- [x] Driver sidebar list with "Focus on Map" action
- [x] WebSocket integration for live updates

### 5.4 Driver Management Pages

- [x] **Driver List:** Status indicators, actions
- [x] **Add/Edit Driver Modal:** Form with validation
- [x] **Driver Detail:** Profile, Delivery History, Performance Stats

### 5.5 Payment Management Pages

- [x] Pending Payments Table (Group by driver)
- [x] Clear Payment Action
- [x] Payment Report View

### 5.6 Analytics and Reports

- [x] **Visual Charts:** Bar/Line/Pie charts for metrics
- [x] **Reports:** Deliveries per driver, Avg time, Success vs Fail
- [x] **Executive Dashboard:** Read-only high-level KPIs

### 5.7 User Management (Admin)

- [x] User List (Managers, Dispatchers)
- [x] Add/Edit User Modals (Role assignment)

### 5.8 Notification Center

- [x] Header Dropdown with unread badge
- [x] Notification List Page
- [x] WebSocket/Polling for real-time alerts
- [x] Toast notifications for critical events (Order Rejected)

### 5.9 Settings and Preferences

- [x] User Profile settings
- [x] Language Switcher (English/Arabic)
- [x] RTL Layout support for Arabic

---

## 6. Mobile Application Development (Flutter - Android)

### 6.1 Flutter Project Setup

- [x] Initialize Flutter project
- [x] Configure Android Manifest (Permissions: Location, Camera, Internet)
- [x] Set up Material Design theme
- [x] Configure App Icons and Splash Screen

### 6.2 State Management & Core

- [x] Setup Provider/Riverpod/Bloc
- [x] Create Auth Provider (Token management)
- [x] Create Sync Queue Provider (Offline actions)
- [x] Setup Local Database (SQLite/Hive) for offline storage

### 6.3 API & Services

- [x] HTTP Client (Dio) with Interceptors
- [x] Location Service (Background/Foreground tracking)
- [x] File Upload Service (Compression)
- [x] FCM Integration (Push Notifications)

### 6.4 Screens & UI

- [x] **Auth:** Login Screen, "Keep me logged in"
- [x] **Home:** Bottom Navigation, Status Toggle (Online/Offline)
- [x] **Orders List:** Cards with status colors, Pull-to-refresh
- [x] **Order Detail:**
- [x] Customer info & Map Navigation button
- [x] Call Customer button
- [x] Status Action buttons (Received, Picked Up, On Way)

- [x] **Delivery Completion:**
- [x] Payment Collection Input (COD/Knet)
- [x] Proof of Delivery (Signature Pad & Camera)

- [x] **Order Rejection:** Modal with reason input
- [x] **Settings:** Language toggle, Sync status

### 6.5 Offline Functionality

- [x] Local caching of assigned orders
- [x] Queueing system for status updates and images
- [x] Background sync worker
- [x] Connectivity change detection

### 6.6 Bilingual Support

- [x] Implementation of `flutter_localizations`
- [x] AR/EN resource files
- [x] RTL Layout handling

---

## 7. Integration and Testing

### 7.1 Integration

- [ ] Verify Dashboard <-> Backend API
- [ ] Verify Mobile <-> Backend API
- [ ] Test Real-time Map (Mobile GPS -> Backend -> Dashboard WebSocket)
- [ ] Test Push Notifications (Backend -> Firebase -> Mobile)

### 7.2 Unit & Integration Testing

- [x] **Backend:** Pytest for API endpoints and DB models
- [x] **Frontend:** React Testing Library for components
- [x] **Mobile:** Widget tests for key flows

### 7.3 End-to-End (E2E) Testing

- [ ] Test full flow: Import -> Assign -> Mobile Receive -> Deliver -> Proof
- [ ] Test Offline Sync flow
- [ ] Test "Driver goes offline with active orders" scenario

### 7.4 Performance Testing

- [ ] Load test API (100+ concurrent drivers)
- [ ] Test Excel import (500+ rows)
- [ ] Optimize Map rendering

---

## 8. Documentation

- [ ] **API:** Swagger/OpenAPI docs
- [ ] **DB:** ERD Diagram
- [ ] **User Guides:** Manager Manual & Driver One-pager
- [ ] **Dev:** Setup guide & Architecture overview

---

## 9. Deployment

- [ ] **Backend:** Dockerize -> Push to Artifact Registry -> Deploy to Cloud Run
- [ ] **Frontend:** Build -> Upload to Cloud Storage -> Configure CDN
- [ ] **Database:** Production Cloud SQL setup (Backups, HA)
- [ ] **Mobile:** Build Signed APK -> Distribute via Internal Track/Firebase
- [ ] **CI/CD:** GitHub Actions/Cloud Build pipelines

---

## 10. Maintenance

- [ ] Configure Cloud Monitoring & Alerts
- [ ] Set up Error Reporting (Sentry or Cloud Logging)
- [ ] define Backup & Restore procedures
- [ ] Schedule regular app updates
