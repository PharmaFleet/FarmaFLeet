# Mobile App Design Specification (Flutter Driver App)

This document defines the mobile app redesign plan to align with the React dashboard's visual language, while delivering a polished, mobile-first Flutter experience using Material Design 3 and the existing BLoC architecture.

## 1) Project Overview
- Goal: Redesign the Flutter driver app to visually mirror the dashboard, providing pixel-perfect components and a cohesive design system for mobile.
- Scope: End-to-end UI overhaul across all screens, preserving the current business logic and BLoC-based state management while updating only presentation.
- Constraints: Do not modify non-UI logic; maintain light/dark theming, accessibility, and RTL support.

## 2) Technology Stack (Target)
- Framework: Flutter (Material Design 3)
- State Management: BLoC
- Networking: Dio
- Navigation: GoRouter
- Localization: Flutter Localizations (l10n)
- Testing: Flutter test, integration tests

## 3) Design System Foundation

### 3.1 Color Palette
- Primary: #059669 (Emerald-600)
- Surface: #FFFFFF and #F8FAFC (card/surface surfaces)
- Background: #F8FAFC
- On-Surface: #0F172A (Slate-900)
- Semantic Status Colors:
  - Orders (Blue-500): #3B82F6
  - Drivers (Emerald-500): #10B981
  - Payments (Amber-500): #F59E0B
  - Analytics (Purple-500): #8B5CF6
  - Delivery (Indigo-500): #6366F1
  - Failed/Cancelled (Red-500): #EF4444

> Note: Centralize tokens in lib/theme to map to Flutter ColorScheme.

### 3.2 Typography
- Headings: headlineLarge, headlineMedium
- Subtitles & labels: titleMedium, bodyMedium, bodySmall
- Button text: labelLarge
- Ensure WCAG-compliant contrast; RTL support for Arabic.

### 3.3 Spacing & Elevation
- Spacing scale: 4, 8, 12, 16, 24, 32
- Radius: 8–12px (md to lg)
- Elevation: subtle shadow on cards; dividers for separation

### 3.4 Breakpoints & Responsiveness
- Mobile-first: layout adapts using MediaQuery
- Small: 1-column stacks; Medium+: 2-column grids where appropriate

### 3.5 Animations & Motion
- Standard durations: 200–300ms
- Skeleton loaders for loading states; subtle card/button transitions

### 3.6 Accessibility & Localization
- RTL support; semantic labels; focus order; high-contrast modes

## 4) Component Architecture

### Core Components
- StatCard: displays a single dashboard metric (title, value, description, icon)
- StatusBadge: compact colored badge for order/status indicators
- AppButton: reusable button with variants (default, secondary, outline, destructive, ghost)
- MiniMapView: map container (Google Maps) with markers/positions
- ActivityItem: item in the Recent Activity feed
- OrderCard: list item for orders with status badge and actions
- CardContainer: generic card with consistent padding and border radius

### Props & Accessibility (Conceptual)
- StatCard
  - title: String
  - value: String
  - description: String
  - icon: IconData
  - color/background tokens
- StatusBadge
  - status: String/enum
- AppButton
  - variant: default|secondary|outline|destructive|ghost
  - size: default|sm|lg|icon
- MiniMapView
  - markers, onTap
- OrderCard
  - orderId, customerName, amount, status

### Layout & Interaction Patterns
- Dashboard: 1–2 column grid on mobile; map card; activity card
- Orders: ListView with OrderCard; pull-to-refresh; details navigation
- Delivery: Stepper-like flow with signature capture and image upload
- Settings: Preferences with consistent styling

## 5) Layout Patterns (Mobile-First)
- Home: 2x2 StatCard grid, Real-Time Tracking card with MiniMapView, Recent Activity card
- Orders: Card-based order entries with status chips
- Delivery: Screen sequence for pickup, in-transit, delivery confirmation

## 6) Interaction Patterns
- Pull-to-refresh on lists
- Swipe actions for quick operations
- Bottom sheets for filters and extra actions
- Floating Action Button for primary actions (e.g., start delivery, navigate)
- Snackbars/toasts for feedback

## 7) Phase & Roadmap
- Phase 1: Design System foundations (tokens, theming, typography)
- Phase 2: Core components library
- Phase 3: MVP screens (Home dashboard, Orders)
- Phase 4: Delivery flow enhancements
- Phase 5: Accessibility and testing

## 8) Deliverables & File Layout (New files only)
- docs/design/mobile-app-specs.md (this spec)
- lib/theme/ (theme tokens and ThemeData)
- lib/widgets/ (StatCard, StatusBadge, AppButton, MiniMapView, ActivityItem, OrderCard)
- lib/features/home/ (Dashboard screen)
- lib/features/orders/ (Orders screens)
- tests/ (unit/widget tests for new components)

## 9) Review & Next Steps
- Confirm any brand-specific colors or typography changes
- Confirm file paths for placing the design system skeleton
- If approved, I will scaffold the Flutter codebase aligned to this spec (Phase 1) and produce example component templates

End of Mobile App Specs. If you want any changes to the path or structure, tell me and I’ll adjust accordingly.
