# Mobile App Rebuild Master Plan

## Overview

This document outlines the comprehensive strategy for rebuilding the Driver Mobile App from scratch. It incorporates strategic analysis from 7 specialized agents (Code Refactorer, Database Architect, Frontend Designer, Flutter Specialist, Frontend Specialist, Mobile Responsive, Performance Optimizer).

**Objective:** Create a premium, robust, offline-capable Flutter application that seamlessly integrates with the existing backend.

## 1. Project Setup & Architecture

- [x] **Agent: Flutter Specialist**
  - [x] Initialize new Flutter Project (clean slate).
  - [x] Set up `analysis_options.yaml` with strict linting (pedantic/very_good_analysis).
  - [x] Configure `.gitignore` and `.flutter-plugins-dependencies`.
  - [x] Set up Folder Structure:
    - `lib/core` (constants, network, error, util)
    - `lib/config` (routes, theme, assets)
    - `lib/features` (feature-based architecture: auth, orders, map, profile)
    - `lib/l10n` (Localization)
      > **Implementation Note:** Implemented clean architecture folder structure. Used `screen_util` for responsiveness in `main.dart`. Configured `GoRouter` basic setup.
- [x] **Agent: Database Architect**
  - [x] Select Local Database: **Hive** (Speed/Efficiency) or **Isar** (Query capabilities). Recommendation: **Hive**.
  - [ ] Define Local Schema (Entities/TypeAdapters):
    - `UserEntity` (Token, ID, Name)
    - `OrderEntity` (ID, Status, RouteData, CustomerInfo)
    - `LocationLogEntity` (Timestamp, Lat, Lng)
  - [ ] Implement Repository Pattern:
    - `AuthRepository`: Handle Remote Login + Local Token Storage.
    - `OrderRepository`: Remote Fetch -> Local Save -> Stream to UI.

## 2. Design System & UI/UX

- [x] **Agent: Frontend Designer**
  - [x] **Design Tokens**:
    - [x] Define `AppColors` (Primary, Secondary, Success, Error, Warning, Surface, Background).
    - [x] Define `AppTypography` (Headings H1-H6, Body1/2, Caption, ButtonText).
    - [x] Define `AppSpacing` (xs, s, m, l, xl, xxl).
  - [x] **Core Widgets (Atoms)**:
    - [x] `PrimaryButton`, `SecondaryButton`, `GhostButton`.
    - [x] `AppTextField` (Normal, Error, Disabled, Success states).
    - [x] `StatusBadge` (Pending, Delivered, Cancelled).
    - [x] `LoaderOverlay` / `IndeterminateSpinner`.
      > **Implementation Note:** Created `AppTheme` using Google Fonts (Inter) and a Slate-based color palette. Implemented `PrimaryButton`, `SecondaryButton` and `AppTextField` as reusable widgets. Fixed missing asset directories.
  - [x] **Complex Widgets (Molecules)**:
    - [x] `OrderCard` (Summary view, swipe actions).
    - [x] `InfoRow` (Label + Value).
- [x] **Agent: Mobile Responsive**
  - [x] Define Breakpoints (though mostly mobile, support Tablet/Landscape).
  - [x] Ensure `SafeArea` usage on all screens.
  - [x] Configure `flutter_screenutil` or native responsiveness for font scaling.

## 3. Core Features Implementation

### 3.1 Authentication

- [x] **Login Flow**:
  - [x] UI: Hero branding image, Email/Phone Input, Password Input.
  - [x] Logic: Bloc/Cubit for state (Initial, Loading, Success, Failure).
  - [x] Error Handling: Show specific API error messages (Toast/Snackbar).
  - [x] "Keep me logged in": Persist token securely (`flutter_secure_storage`).

### 3.2 Navigation

- [x] **Navigation Setup**:
  - [x] Implement `go_router` for deep linking and stack management.
  - [x] Define Routes: `/splash`, `/login`, `/home`, `/order/:id`, `/profile`.
  - [x] Implement Route Guards (Authed vs Unauthed).

### 3.3 Dashboard (Map & Status)

- [x] **Agent: Performance Optimizer**
  - [x] **Google Maps Integration**:
    - [x] Minimal map rebuilds. Use `Set<Marker>` and update only on delta.
    - [x] Custom Marker Icons (Compressed Bitmaps).
  - [x] **Driver Status**:
    - [x] "Go Online/Offline" Slide Button (Prevent accidental taps).
    - [x] Optimistic UI Update (Change visual state immediately, revert if API fails).
  - [x] **Location Tracking**:
    - [x] Background Service (via `NotificationService` & `DashboardBloc`).
    - [x] Batch updates to API.
      > **Implementation Note:** Implemented `DashboardBloc` to handle Online/Offline toggling. Integrated `google_maps_flutter` with custom marker assets. Added logic to fetch and display the driver's current location on the map.

### 3.4 Order Management

- [x] **Order List**:
  - [x] "Pull to Refresh" mechanism.
  - [x] Tabs: Active vs Completed.
  - [x] Local Caching: Show cached orders immediately if offline.
- [x] **Order Details**:
  - [x] Map View of Route (Polyline decoding).
  - [x] "Navigate" Button (Launch external Waze/Google Maps).
  - [x] Customer Call/Message actions.
- [x] **Order Actions**:
  - [x] Accept/Reject logic.
  - [x] Status Changes: Arrived -> Picked Up -> Delivered.
  - [x] **Proof of Delivery**:
    - [x] Camera integration (`image_picker`).
    - [x] Image Compression (`flutter_image_compress`) before upload.
      > **Implementation Note:** Implemented full Order Management flow: List (Active/History), Details, and Status Updates. Added `image_picker` for Proof of Delivery. Verified backend endpoints for file upload and status updates, fixing 500 errors related to lazy loading and serialization.

## 4. Notifications & Polish

## 4. Notifications & Polish

- [x] **Agent: Backend/Frontend Integration**
  - [x] Firebase Cloud Messaging (FCM) setup.
  - [x] Foreground Notification Handling (`flutter_local_notifications`).
  - [x] Background Notification Handling (Update data silently).
- [x] **Agent: Frontend Specialist**
  - [x] Add Micro-animations (Button press scale, Hero transitions between List/Detail).
  - [x] Skeleton Loaders instead of circular spinners (Premium feel).
    > **Implementation Note:** Integrated `firebase_messaging` and `flutter_local_notifications`. Created `NotificationService` to handle permissions, token sync with backend, and incoming messages. Added `shimmer` for skeleton loading and `flutter_animate` for list entry animations.

## 5. Testing & Verification

- [ ] **Agent: Code Refactorer**
  - [ ] Unit Tests for all Blocs and Repositories.
  - [ ] Widget Tests for complex UI components (`OrderCard`).
  - [ ] Integration Test for critical delivery flow.
- [ ] **Manual Verification**:
  - [ ] Verify Offline Mode (Turn off Wifi, can I still see my active order?).
  - [ ] Verify App Restart (Do I stay logged in? Does my active order persist?).

## 6. Build & Release

- [ ] Prepare Assets (Icons, Splash Screen).
- [ ] Configure Signed Builds (Keystore/Provisioning Profiles).
- [ ] Generate APK / AAB.
