# PharmaFleet PlanToOps

## Executive Summary

This document outlines the operational and technical roadmap for the next phase of PharmaFleet development. The focus is on stabilizing the core dashboard, enabling critical operational features (Multi-select, Order Lifecycle), fixing known issues (CORS, Users Page), and launching the Mobile Driver App.

## 1. Critical Bug Fixes & Stability

### 1.1 Fix Driver Creation (Network Error) ✅ COMPLETED

- **Issue**: Adding a driver allows `3001` (localhost) but fails on production storage/CORS checks.
- **Solution**: Update Backend CORS configuration to allow all operational domains.
- **Technical Steps**:
  - Modify `backend/app/core/config.py` to include `https://storage.googleapis.com` and production frontend URLs.
  - Verify `CORSMiddleware` in `main.py`.

### 1.2 Fix Users Page Functionality ✅ COMPLETED

- **Issue**: Users page reported as "unfunctional". Code exists but may be failing on API connection or rendering.
- **Solution**: Full debug of `UsersPage.tsx` connection to `GET /api/v1/users`.
- **Technical Steps**:
  - Check browser console for specific errors.
  - Verify `userService.getAll()` correctly calls the backend.
  - Ensure correct role permissions are being returned.
- **Implementation Notes** (Completed 2026-01-27):
  - Root cause: Endpoint required `is_superuser=True` via `get_current_active_superuser`
  - Fixed by changing permission to `requires_role(["admin", "super_admin", "warehouse_manager"])`
  - Now admins and warehouse managers can access the Users page

## 2. New Dashboard Features

### 2.1 Multi-select Order Assignment ✅ COMPLETED

- **Goal**: Allow managers to assign multiple orders to a single driver in one action.
- **Implementation**:
  - **Frontend**: Add checkbox column to `OrdersPage` table.
  - **UI**: Show "Assign Selected ({count})" button when items are checked.
  - **Backend**: Endpoint `POST /api/v1/orders/batch-assign` already exists; verify and connect it.
- **Implementation Notes** (Completed 2026-01-27):
  - Created `Checkbox` component at `frontend/src/components/ui/checkbox.tsx`
  - Created `BatchAssignDriverDialog` component for batch assignment
  - Updated `OrdersPage.tsx` with multi-select state, select-all checkbox, per-row checkboxes, and floating action bar

### 2.2 Order Deletion vs Cancellation ✅ COMPLETED

- **Goal**: Distinguish between soft cancellation (status change) and hard deletion (data removal).
- **Implementation**:
  - **Cancel**: existing "Cancel" action should set status to `CANCELLED`.
  - **Delete**: Add "Delete Permanently" action (admin only) that calls `DELETE /api/v1/orders/{id}`.
  - **Backend**: Implement `DELETE` endpoint to remove order and cascades (history, PODs).
- **Implementation Notes** (Completed 2026-01-27):
  - Added `POST /api/v1/orders/{order_id}/cancel` endpoint with status validation
  - Added `DELETE /api/v1/orders/{order_id}` endpoint (admin-only) with cascade delete
  - Updated `orderService.ts` with `cancelOrder` and `deleteOrder` methods
  - Updated `OrdersPage.tsx` dropdown with Cancel and Delete (admin-only) options with proper icons

### 2.3 Payment Methods Expansion ✅ COMPLETED

- **Goal**: Support full list of payment methods from imports.
- **Implementation**:
  - Update import logic to accept: "Knet - Visa", "My Fatoorah", "Insurance", "Talabat", "Heal", "Wasfa", "Deliveroo", "Tamara", "Cari", "Jameia", "Tally", "Jahez", "Salamtek".
  - Ensure these values are stored correctly in `payment_method` column without enum validation errors.
- **Implementation Notes** (Completed 2026-01-27):
  - Updated Excel import logic to read payment method from "Payment Method" column
  - Payment method stored as VARCHAR - accepts any string value
  - Falls back to "CASH" if not specified in import

### 2.4 Order Lifecycle & Archiving ✅ COMPLETED

- **Goal**: Prevent "thousands of pages" of old orders from cluttering the active view.
- **Strategy**:
  - **Retention Policy**: Keep delivered orders in active view for **7 days**.
  - **Archiving**:
    - Add `is_archived` flag to `Order` table.
    - Create a daily background job (Cron/Cloud Scheduler) to mark `status='DELIVERED' AND updated_at < NOW() - 7 days` as `is_archived=True`.
    - Update default `GET /orders` to filter `is_archived=False`.
    - Add "View Archive" toggle/page to see old orders.
- **Implementation Notes** (Completed 2026-01-27):
  - Added `is_archived` column to Order model with index
  - Created migration `add_is_archived_column.py`
  - Updated GET /orders with `include_archived` query parameter (default: False)
  - Added POST /orders/{id}/archive and /unarchive endpoints
  - Added POST /orders/auto-archive endpoint for cron job (archives DELIVERED orders > 7 days)

## 3. Mobile App Rollout

### 3.1 Mobile App Finalization

- **Goal**: Get the driver app ready for E2E testing.
- **Steps**:
  - Verify authentication flow with actual backend.
  - Test "Receive Order" push notifications (Firebase).
  - Verify Google Maps navigation intent.
  - Test Offline -> Online sync of proof-of-delivery.

### 3.2 UI/UX Redesign ✅ COMPLETED

- **Goal**: Improve driver efficiency and app aesthetics.
- **Implementation**:
  - **Home Screen**: Compact header, expanded map tracking (55% height), integrated Online/Offline toggle.
  - **Orders**: Added Payment Method (CASH/KNET) and prominent Order Value to cards.
  - **Navigation**: Moved daily stats to dedicated "Daily Summary" page to reduce clutter.
  - **Settings**: Modernized with grouped layout (`General`, `Sync`, `Account`) and Profile Header.
- **Implementation Notes** (Completed 2026-01-27):
  - Refactored `home_screen.dart` to optimize map real-estate.
  - Created `daily_summary_screen.dart`.
  - Updated `order_card.dart` layout.
  - Refactored `settings_screen.dart` with modern card styling.

## 4. Operational Rollout Plan

### Phase 1: Fixes (Day 1-2) ✅ COMPLETED

1. ✅ Deploy Backend with CORS fix.
2. ✅ Debug and patch Users Page.
3. ⏳ Validate "Add Driver" flow works in production (requires deployment).

### Phase 2: Dashboard Enhancements (Day 3-5) ✅ COMPLETED

1. ✅ Deploy Multi-select UI.
2. ✅ Deploy Delete/Cancel logic.
3. ✅ Deploy Payment Method updates.
4. ⏳ Run "Archive" migration and schedule daily job (requires deployment).

### Phase 3: Mobile & E2E (Day 6-10)

1. Distribute APK to test devices.
2. Conduct End-to-End test:
   - Import Order -> Assign (Web) -> Receive (Mobile) -> Deliver (Mobile) -> Verify Archive (Web after 7d sim).

## 5. Maintenance & Monitoring

- **Logs**: Monitor Cloud Run logs for "Import Error" or "CORS preflight failure".
- **Backups**: Ensure Cloud SQL daily backups are active before enabling "Delete" features.
