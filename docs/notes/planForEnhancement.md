# Implementation Plan: PharmaFleet Enhancement and Remediation

## Executive Summary

This plan addresses **38 code review findings** (5 critical, 9 high, 14 medium, 8 low) and **15 client-requested enhancements** from the 04 Feb 2026 modification PDF. 6 of the 15 client requests overlap with existing bugs.

**Critical production impact**: Cancellation reasons have been silently lost since deployment. The sync endpoint bypasses the 24-hour archive buffer. Status update notes are silently discarded. All caused by missing `embed=True` on FastAPI Body parameters.

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 0 | Quick Wins (7 items) | COMPLETED |
| Phase 1 | Critical Bug Fixes (5 items) | COMPLETED |
| Phase 2 | Security & Data Integrity (6 items) | COMPLETED |
| Phase 3 | Database Migration | COMPLETED (pending prod deploy) |
| Phase 4 | Client Enhancements (15 items) | COMPLETED |
| Phase 5 | Medium & Low Fixes (22 items) | COMPLETED |
| Phase 6 | Client Meeting Enhancements (16 sub-phases) | COMPLETED |

---

## Phase 0: Quick Wins (deploy within hours) -- COMPLETED

### 0.1 -- CR-01: Fix cancel order reason (solves REQ-06, REQ-07)
- [x] `backend/app/api/v1/endpoints/orders.py` -- Changed `Body(None)` to `Body(None, embed=True)` for `reason` param in `cancel_order`
- **Implementation note**: The `reason` parameter was being parsed from raw body instead of JSON object. With `embed=True`, FastAPI now correctly parses `{"reason": "test"}` from the request body.

### 0.2 -- CR-03: Fix status update notes
- [x] `backend/app/api/v1/endpoints/orders.py` -- Changed `Body(None)` to `Body(None, embed=True)` for `notes` param in `update_order_status`
- **Implementation note**: Same root cause as CR-01. Notes were silently discarded on every status update since deployment.

### 0.3 -- CR-12: Fix OrderDetailsPage status badge case
- [x] `frontend/src/pages/orders/OrderDetailsPage.tsx` -- Changed UPPERCASE comparisons to use `OrderStatus` enum values (lowercase)
- **Implementation note**: Added `import { OrderStatus } from '@/types'`. Changed comparisons from `"DELIVERED"` to `OrderStatus.DELIVERED` etc. Added missing status colors for `ASSIGNED`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`.

### 0.4 -- CR-14: Add missing frontend Order type fields
- [x] `frontend/src/types/index.ts` -- Added `is_archived?: boolean`, `delivered_at?: string`, `assigned_at?: string`, `picked_up_at?: string`, `notes?: string`, `sales_track?: string`
- **Implementation note**: Also added `code?: string` to `Driver` interface for Phase 3.2 compatibility.

### 0.5 -- CR-18/REQ-15: SO Number on mobile OrderCard
- [x] `mobile/driver_app/lib/features/orders/presentation/widgets/order_card.dart` -- Added `salesOrderNumber` param with conditional display in header
- [x] `mobile/driver_app/lib/features/orders/presentation/screens/orders_list_screen.dart` -- Passed `salesOrderNumber: order.salesOrderNumber`
- **Implementation note**: Added a Column widget wrapping the order status text, with the SO number shown in smaller grey text below when available.

### 0.6 -- CR-19: Add missing statuses to sync endpoint
- [x] `backend/app/api/v1/endpoints/sync.py` -- Added `OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT` to the `.in_()` filter
- **Implementation note**: Without these statuses, orders that were picked up while online would disappear from the driver's sync when going offline.

### 0.7 -- CR-20: Add search debounce
- [x] Created `frontend/src/hooks/useDebouncedValue.ts` -- Generic hook with configurable delay (default 300ms)
- [x] `frontend/src/pages/orders/OrdersPage.tsx` -- Added `debouncedSearch` state, used in query key and queryFn
- **Implementation note**: The search input updates `search` state immediately for responsive UI, but `debouncedSearch` (used in API calls) only updates after 300ms of no typing.

---

## Phase 1: Critical Bug Fixes -- COMPLETED

### 1.1 -- CR-02: Sync endpoint bypasses 24h archive buffer
- [x] `backend/app/api/v1/endpoints/sync.py` -- Removed `order.is_archived = True`, set `order.delivered_at = datetime.now(timezone.utc)` instead
- [x] Fixed `datetime.utcnow()` to `datetime.now(timezone.utc)` with proper import
- **Implementation note**: The sync POD endpoint was immediately archiving orders, making them invisible to managers. Now it only sets `delivered_at`, letting the `/auto-archive` cron handle archiving after 24 hours.

### 1.2 -- CR-04: Mixed datetime usage (32+ locations)
- [x] Global replaced `datetime.utcnow()` with `datetime.now(timezone.utc)` across ALL backend files
- [x] Added `from datetime import datetime, timezone` to every affected file
- **Files changed**: orders.py, drivers.py, analytics.py, payments.py, sync.py, notification.py, security.py, websocket.py, driver.py, drivers_admin.py, test files, scripts
- **Implementation note**: Used bash agent to do mechanical find-and-replace. Verified zero remaining `datetime.utcnow()` occurrences with grep. `datetime.now(timezone.utc)` returns timezone-aware datetimes which is correct for PostgreSQL `TIMESTAMP WITH TIME ZONE` columns.

### 1.3 -- CR-05: Excel import atomicity
- [x] `backend/app/api/v1/endpoints/orders.py` -- Changed `await db.commit()` to `await db.flush()` inside the warehouse creation part of the import loop
- **Implementation note**: `flush()` sends SQL to the database (so auto-generated IDs are available) without committing the transaction. If any row fails, the entire import rolls back. The final `db.commit()` at the end of the endpoint commits everything atomically.

---

## Phase 2: Security & Data Integrity -- COMPLETED

### 2.1 -- CR-06: Warehouse access control on write endpoints
- [x] Created `verify_order_warehouse_access()` and `verify_orders_warehouse_access()` helpers in `backend/app/api/deps.py`
- [x] Applied to: cancel, assign, update_status, unassign, archive, unarchive, batch-cancel, batch-assign
- **Implementation note**: `get_user_warehouse_ids()` returns `None` for super_admin (unrestricted access) or a list of warehouse IDs for scoped users. The verify helpers raise 403 if the order's warehouse isn't in the user's allowed list. Batch operations check each order individually within the loop.

### 2.2 -- CR-16: Export endpoint warehouse access control
- [x] `backend/app/api/v1/endpoints/orders.py` -- Added warehouse filtering to export query
- **Implementation note**: Non-admin users only export orders from their assigned warehouses. Uses the same `get_user_warehouse_ids()` pattern.

### 2.3 -- CR-17: Payment endpoints warehouse access control
- [x] `backend/app/api/v1/endpoints/payments.py` -- Added warehouse filtering via Order join to all endpoints
- **Implementation note**: Applied to: `read_payments`, `read_pending_payments`, `payment_report`, `export_payments`. Joins `PaymentCollection` to `Order` to check `Order.warehouse_id`.

### 2.4 -- CR-25: Driver verification on sync status-updates
- [x] `backend/app/api/v1/endpoints/sync.py` -- Rewrote `sync_status_updates` to verify caller is a driver AND order is assigned to them
- **Implementation note**: Added role check (`current_user.role != UserRole.DRIVER` -> 403), driver record lookup, and per-update validation that the order exists and `order.driver_id == driver.id`.

### 2.5 -- CR-26: Add OrderStatusHistory to sync
- [x] `backend/app/api/v1/endpoints/sync.py` -- Creates `OrderStatusHistory` entry for each synced status update
- **Implementation note**: History entries include `changed_by` (user ID), timestamp, old/new status, and notes. This ensures offline status changes appear in the order timeline on the web dashboard.

### 2.6 -- CR-27: Set delivered_at in sync
- [x] `backend/app/api/v1/endpoints/sync.py` -- Sets `order.delivered_at` when syncing DELIVERED status
- **Implementation note**: Combined with 2.4 and 2.5 in the sync rewrite. Also sets `assigned_at` and `picked_up_at` for their respective status transitions.

---

## Phase 3: Database Migration -- COMPLETED (pending production deploy)

### 3.1 -- New Order columns
- [x] `backend/app/models/order.py` -- Added:
  - `assigned_at: DateTime(timezone=True), nullable, indexed`
  - `picked_up_at: DateTime(timezone=True), nullable`
  - `notes: Text, nullable`
  - `sales_track: String, nullable`
- **Implementation note**: All columns are nullable to avoid breaking existing data. `assigned_at` is indexed for sorting performance.

### 3.2 -- New Driver column
- [x] `backend/app/models/driver.py` -- Added `code: String, nullable, unique, indexed`
- **Implementation note**: Unique constraint ensures no duplicate driver codes. Nullable because existing drivers won't have codes until backfill runs.

### 3.3 -- Update Pydantic schemas
- [x] `backend/app/schemas/order.py` -- Added `assigned_at`, `picked_up_at`, `notes`, `sales_track` to `OrderInDBBase`; added `notes` to `OrderCreate`
- [x] `backend/app/schemas/driver.py` -- Added `code: Optional[str] = None` to `DriverBase`

### 3.4 -- Alembic migration
- [x] Created manual migration `backend/migrations/versions/b7e4d2f1a3c9_add_order_timestamps_notes_driver_code.py`
- **Implementation note**: Autogenerate timed out (needs DB connection). Created migration manually with revision chain `a8f3c2d91e57` -> `b7e4d2f1a3c9`. All columns are nullable with `server_default=None`.
- **PENDING**: Run on production (backup via Supabase dashboard first)

### 3.5 -- Backfill script
- [x] Created `backend/scripts/backfill_timestamps.py`
- **Implementation note**: Async script that: (1) populates `assigned_at` from OrderStatusHistory ASSIGNED entries, (2) populates `picked_up_at` from PICKED_UP entries, (3) sets `Driver.code = DRV-{id:03d}` for drivers without codes. Uses `DATABASE_URL` env var.
- **PENDING**: Run after production migration

### 3.6 -- Set timestamps on status transitions
- [x] `orders.py` assign: sets `assigned_at = datetime.now(timezone.utc)`
- [x] `orders.py` batch-assign: sets `assigned_at`
- [x] `orders.py` batch-pickup: sets `picked_up_at`
- [x] `orders.py` update_status: sets `picked_up_at` for PICKED_UP, `delivered_at` for DELIVERED
- [x] `orders.py` unassign: clears `assigned_at = None`
- [x] `sync.py`: sets all timestamps on synced status updates

---

## Phase 4: Client-Requested Enhancements -- COMPLETED

### 4.1 -- REQ-01: Universal search
- [x] `backend/app/api/v1/endpoints/orders.py` -- Extended search with `exists()` subqueries for cross-table search
- **Implementation note**: Search uses OR logic across: order#, customer name/phone/address/area, status, notes, sales_track, amount. Driver search (name/phone/code) and warehouse search (code) use `exists()` subqueries to avoid changing the main query's join semantics.

### 4.2 -- REQ-02: Column sorting
- [x] Backend: Added `sort_by`, `sort_order` query params with whitelist validation (`SORT_COLUMNS` dict)
- [x] Frontend: Added `SortableHeader` component with clickable sort indicators, passes `sort_by`/`sort_order` to API
- **Implementation note**: Whitelist approach prevents SQL injection via sort column. Supported columns: created_at, updated_at, sales_order_number, status, total_amount, assigned_at, picked_up_at, delivered_at.

### 4.3 -- REQ-03: Resizable columns
- [x] Implemented in Phase 6.12 using CSS + custom `useColumnResize` hook with localStorage persistence. No @tanstack/react-table migration needed.

### 4.4 -- REQ-04: Driver Mobile and Driver Code columns
- [x] Frontend: Added "Driver Mobile" and "Driver Code" columns to orders table
- [x] Frontend types: Added `code?: string` to Driver interface
- **Implementation note**: Driver Mobile shows `order.driver?.user?.phone`, Driver Code shows `order.driver?.code`.

### 4.5 -- REQ-05: Export to Excel (solves CR-13)
- [x] Backend: Export now includes warehouse access control (Phase 2.2)
- [x] Frontend: Added `exportOrders()` to `orderService.ts`, added Export button next to Import
- **Implementation note**: `exportOrders()` triggers a blob download via `window.URL.createObjectURL`. The button is styled to match the Import button.

### 4.6 -- REQ-06: Fix cancel error
- [x] Solved by Phase 0.1 (CR-01)
- [x] Frontend: Improved error message to show actual backend detail via `(_err as any)?.response?.data?.detail`

### 4.7 -- REQ-07: Cancel/return notes
- [x] Created `frontend/src/components/orders/CancelOrderDialog.tsx` -- Styled dialog with reason textarea
- [x] Wired into OrdersPage replacing `window.confirm()`
- **Implementation note**: Dialog has a required reason textarea (min 1 char), cancel/confirm buttons, and loading state. The `cancelMutation` now accepts `{id, reason}` object.

### 4.8 -- REQ-08: Create Order form enhancements
- [x] `frontend/src/components/orders/CreateOrderDialog.tsx` -- Dynamic warehouse dropdown (fetched from API)
- [x] Added notes textarea
- **Implementation note**: Warehouses are fetched via `useQuery` when dialog opens (`enabled: open`). Dropdown shows `{code} - {name}` format. Notes field is optional with placeholder text. Driver assignment dropdown deferred (PENDING-02).

### 4.9 -- REQ-09: Show Created Time/Date
- [x] Frontend: Added "Created" column to orders table with date formatting
- **Implementation note**: Uses `format(new Date(order.created_at), 'MMM d, HH:mm')` from date-fns.

### 4.10 -- REQ-10: Show Assigned Time/Date
- [x] Frontend: Added "Assigned" column displaying `order.assigned_at`
- **Implementation note**: Shows formatted date or dash when null.

### 4.11 -- REQ-11: Show Picked Up Time/Date
- [x] Frontend: Added "Picked Up" column displaying `order.picked_up_at`

### 4.12 -- REQ-12: Show Delivered Time/Date
- [x] Frontend: Added "Delivered" column displaying `order.delivered_at`

### 4.13 -- REQ-13: Sales Taker (formerly Sales Track)
- [x] Resolved in Phase 6.0 (rename `sales_track` → `sales_taker`) + Phase 6.5 (Excel import parsing from "Sales taker" column) + Phase 6.7 (frontend filter) + Phase 6.8 (sortable header)
- **Implementation note**: Column renamed via Alembic migration `c8f3a1b2d4e5`. Excel import now parses "Sales taker" / "Sales Taker" columns. Frontend shows column in orders table with search, sort, and filter support.

### 4.14 -- REQ-14: Delivery Time (Hours:Minutes)
- [x] Resolved in Phase 6.9. Computed as `delivered_at - picked_up_at`, displayed as HH:MM in both OrdersPage table and OrderDetailsPage delivery details.

### 4.15 -- REQ-15: SO Number on mobile
- [x] Solved by Phase 0.5 (CR-18)

---

## Phase 5: Medium & Low Priority Fixes -- COMPLETED

### Medium
- [x] CR-07: Move `/auto-archive` route before `/{order_id}` routes -- Moved to STATIC POST ROUTES section above batch operations
- [x] CR-08: Standardize enum comparisons (remove `.value`) -- Removed `.value` from OrderStatus comparisons in batch-pickup and batch-delivery
- [x] CR-09: Add `selectinload` to `read_driver_orders` in drivers.py -- Added `selectinload(Order.status_history)`, `selectinload(Order.proof_of_delivery)`, `selectinload(Order.warehouse)`
- [x] CR-10: Re-fetch driver with eager loading after creation -- `create_driver` now re-fetches with `selectinload(Driver.user), selectinload(Driver.warehouse)` instead of `db.refresh()`
- [x] CR-15: Bulk fetch in batch operations (eliminate N+1) -- Replaced per-order `db.get()` with bulk `select().where(Order.id.in_())` + dict map lookup in batch-pickup, batch-delivery, batch-assign, batch-return
- [x] CR-21: Remove/redact JWT token logging in mobile -- Changed to log token length only: `Token attached (${token.length} chars)`
- [x] CR-22: Fix type hints in backend -- Replaced `-> Any` with specific return types (`-> Dict[str, Any]`, `-> List[Dict[str, Any]]`, etc.) across orders.py, analytics.py, payments.py, sync.py
- [x] CR-23: Validate status enum in sync endpoint -- Done as part of Phase 2.4 sync rewrite (validates against OrderStatus enum)
- [x] CR-24: Consolidate double-commit patterns -- Consolidated in assign_order (flush+commit), cancel_order (single commit), batch_assign (flush+commit). Notifications now committed atomically with their parent operations.
- [x] CR-28: Add pagination to `read_driver_orders` -- Added `page`, `size` query params with count query. Returns `{items, total, page, size, pages}`.

### Low
- [x] CR-29: Replace `print()` with `logger` calls -- Replaced in notification.py (10 calls), notifications.py (1), analytics.py (1), orders.py (2), drivers.py (1). Left middleware.py fallback print as-is.
- [x] CR-30: Replace `.dict()` with `.model_dump()` -- Fixed in drivers.py `update_driver` and removed `.dict()` fallback in cache.py
- [x] CR-31: Remove unused imports/dead code -- Removed unused `uuid` (orders.py), `literal`/`selectinload` (analytics.py), `Dict` (notification.py); added missing `WebSocketDisconnect` import (drivers.py)
- [x] CR-32: Remove/implement stub endpoints -- Assessed: no stubs found, all endpoints are fully implemented
- [x] CR-33: Add action buttons to OrderDetailsPage (assign, cancel, archive) -- Added Assign/Reassign, Cancel, Archive/Unarchive buttons. Added AssignDriverDialog and CancelOrderDialog integration.
- [x] CR-34: Add driver orders pagination to frontend -- Added `driverService.getDriverOrders()` using `/drivers/{id}/orders` endpoint, DriverDetailsPage now has pagination controls (10/page) with `keepPreviousData`
- [x] CR-35: Standardize error response formats -- Unified batch error dicts to `{"order_id": ..., "error": ...}` format across sync.py and all batch endpoints
- [x] CR-36: Add request logging middleware -- Already exists in `backend/app/api/middleware.py` as `RequestLoggingMiddleware`, registered in `main.py`
- [x] CR-37: Add `/health` endpoint -- Added to `backend/app/main.py`
- [x] CR-38: Mobile 401 token refresh handling -- Token refresh flow: stores refresh_token, attempts `/auth/refresh` on 401, retries original request on success, only logs out if refresh fails

### Frontend Enhancements (proactive)
- [x] Status timeline on OrderDetailsPage (render status_history) -- Shows chronological status entries with dot timeline, notes, and timestamps
- [x] POD display on OrderDetailsPage (show photo + signature) -- Shows delivery photos and signature images in a grid with links to full-size
- [x] Warehouse filter dropdown on orders list -- Covered by Phase 6.7 advanced filters panel (warehouse_code field-specific filter)
- [x] Payment method filter on orders list -- Covered by Phase 6.7 advanced filters panel (payment_method field-specific filter)

---

## Phase 6: Client Meeting Enhancements -- COMPLETED

All client questions from PENDING-01 through PENDING-08 were answered in the 05 Feb 2026 meeting. Full implementation plan: `C:\Users\ahmad\.claude\plans\recursive-floating-duckling.md`

| Sub-Phase | Description | Status |
|-----------|-------------|--------|
| 6.0 | Rename `sales_track` → `sales_taker` (migration + model + schema + search) | COMPLETED |
| 6.1 | Return workflow — `POST /orders/{id}/return` + `POST /orders/batch-return` | COMPLETED |
| 6.2 | Field-specific search (13 new query params) + date range filters | COMPLETED |
| 6.3 | Extended sorting (7 new sortable columns via subqueries) | COMPLETED |
| 6.4 | Enhanced export (19 columns, accepts all filter params) | COMPLETED |
| 6.5 | Enhanced import (parse Sales taker, Retail payment method, Customer account) | COMPLETED |
| 6.6 | Driver code = biometric code (creation + seed + backfill) | COMPLETED |
| 6.7 | Advanced filters panel (8 text filters + date range + date column selector) | COMPLETED |
| 6.8 | Extended sortable headers (6 new sortable columns in frontend) | COMPLETED |
| 6.9 | Delivery time column (computed HH:MM from `picked_up_at → delivered_at`) | COMPLETED |
| 6.10 | Return Order UI (ReturnOrderDialog, BatchReturnDialog, useBulkReturn hook) | COMPLETED |
| 6.11 | Vehicle type icons (Car/Motorcycle) + Add/Edit Driver dialogs | COMPLETED |
| 6.12 | Column resizing with drag handles + localStorage persistence | COMPLETED |
| 6.13 | Export wiring — passes all active filters/search/sort to export | COMPLETED |
| 6.14 | Mobile: SO number on order detail AppBar | COMPLETED |
| 6.15 | Mobile: Return order from driver app (dialog + BLoC + repository) | COMPLETED |

### New files created in Phase 6
| File | Purpose |
|------|---------|
| `backend/migrations/versions/c8f3a1b2d4e5_rename_sales_track_to_sales_taker.py` | Alembic migration |
| `frontend/src/components/orders/ReturnOrderDialog.tsx` | Single return dialog (orange, reason required) |
| `frontend/src/components/orders/BatchReturnDialog.tsx` | Batch return dialog |
| `frontend/src/hooks/useBulkReturn.ts` | React Query mutation hook for batch return |
| `frontend/src/hooks/useColumnResize.ts` | Column resize hook with localStorage |
| `frontend/src/components/shared/VehicleIcon.tsx` | Car/Motorcycle icon component |

### Bug fixes found during Phase 6 review
- Fixed `entry.created_at` → `entry.timestamp` in status timeline (OrderDetailsPage)
- Fixed `pod.created_at` → `pod.timestamp` in POD display (OrderDetailsPage)
- Fixed POD rendering from array iteration to single object (matches `uselist=False` backend)
- Fixed `CancelOrderDialog.onConfirm` callback signature mismatch
- Added RETURNED badge color to OrderDetailsPage
- Fixed optimistic update query key to match actual query key (OrdersPage)

### Client answers resolved
| ID | Question | Answer |
|----|----------|--------|
| PENDING-01 | Sales Track format | Renamed to "Sales Taker", parsed from Excel "Sales taker" column (Arabic names) |
| PENDING-02 | Driver Code source | Use biometric_id as driver code |
| PENDING-03 | Branch = Warehouse? | Yes, Branch = Warehouse |
| PENDING-04 | Return Workflow | Separate from Cancel; Return only for DELIVERED orders, reason required |
| PENDING-05 | Delivery Time calc | `delivered_at - picked_up_at`, displayed as HH:MM |
| PENDING-06 | Search logic | Both: universal search (OR) + field-specific filters (AND) |
| PENDING-07 | Column visibility | Show all columns, resizable with persisted widths |
| PENDING-08 | Cancel reason format | Free-text textarea |

---

## Future Roadmap

| Feature | Business Value | Prerequisites |
|---------|---------------|---------------|
| Delivery performance dashboard | Track SLA compliance, driver metrics | Phase 4 timestamps (done) |
| Driver scorecard | Composite performance scoring | Analytics data |
| SLA monitoring with alerts | Proactive delivery management | Delivery time (done in Phase 6.9) |
| Auto-assignment suggestions | Reduce manual dispatch workload | Driver location + workload data |
| Customer SMS/WhatsApp notifications | Better customer experience | Customer phone data (exists) |
| Route optimization | Reduce delivery times | Google Directions API integration |

---

## Dependency Map

```
Phase 0 (Quick Wins) ---- COMPLETED
    |
Phase 1 (Critical Fixes) ---- COMPLETED
    |
Phase 2 (Security) ---- COMPLETED
    |
Phase 3 (DB Migration) ---- COMPLETED (pending prod deploy)
    |
    +---> Phase 4 (Client Enhancements) ---- COMPLETED
    |
    +---> Phase 5 (Med/Low Fixes) ---- COMPLETED
    |
    +---> Phase 6 (Client Meeting) ---- COMPLETED (16 sub-phases)
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Status |
|------|-----------|--------|------------|--------|
| Production migration failure | Low | Critical | Supabase backup first; `alembic downgrade -1` rollback | Open — 2 migrations pending |
| datetime replacement regression | Low | High | Mechanical change; full test suite passed | Mitigated |
| Warehouse access control blocks workflows | Low | Medium | Enforce mode active, no issues reported | Mitigated |
| TanStack Table migration breaks UX | N/A | N/A | Avoided entirely — used CSS + custom hook instead | Resolved |
| Sync changes break mobile offline | Low | High | Test with Flutter app in airplane mode | Mitigated |
| Client answers change assumptions | N/A | N/A | All 8 pending questions answered and implemented | Resolved |

---

## Appendix: File Index

### Backend
| File | Items |
|------|-------|
| `backend/app/api/v1/endpoints/orders.py` | CR-01,03,05,06,07,08,15,16,24; REQ-01,02,05 |
| `backend/app/api/v1/endpoints/sync.py` | CR-02,19,23,25,26,27 |
| `backend/app/api/v1/endpoints/drivers.py` | CR-04,09,10,28,30 |
| `backend/app/api/v1/endpoints/payments.py` | CR-04,17 |
| `backend/app/api/v1/endpoints/analytics.py` | CR-04,29 |
| `backend/app/models/order.py` | Phase 3.1 |
| `backend/app/models/driver.py` | Phase 3.2 |
| `backend/app/schemas/order.py` | Phase 3.3 |
| `backend/app/schemas/driver.py` | Phase 3.3 |
| `backend/app/services/notification.py` | CR-04,29 |
| `backend/app/core/security.py` | CR-04 |

### Frontend
| File | Items |
|------|-------|
| `frontend/src/pages/orders/OrdersPage.tsx` | CR-20; REQ-01-05,09-12 |
| `frontend/src/pages/orders/OrderDetailsPage.tsx` | CR-12,33 |
| `frontend/src/components/orders/CreateOrderDialog.tsx` | CR-11; REQ-08 |
| `frontend/src/services/orderService.ts` | CR-13; REQ-05 |
| `frontend/src/types/index.ts` | CR-14; REQ-04 |

### Mobile
| File | Items |
|------|-------|
| `mobile/.../widgets/order_card.dart` | CR-18; REQ-15 |
| `mobile/.../screens/orders_list_screen.dart` | REQ-15 |
| `mobile/.../core/network/dio_client.dart` | CR-21,38 |

### New Files
| File | Purpose |
|------|---------|
| `backend/scripts/backfill_timestamps.py` | Phase 3.5 |
| `backend/migrations/versions/c8f3a1b2d4e5_rename_sales_track_to_sales_taker.py` | Phase 6.0 |
| `frontend/src/hooks/useDebouncedValue.ts` | CR-20 |
| `frontend/src/hooks/useColumnResize.ts` | Phase 6.12 |
| `frontend/src/hooks/useBulkReturn.ts` | Phase 6.10 |
| `frontend/src/components/orders/CancelOrderDialog.tsx` | REQ-07 |
| `frontend/src/components/orders/ReturnOrderDialog.tsx` | Phase 6.10 |
| `frontend/src/components/orders/BatchReturnDialog.tsx` | Phase 6.10 |
| `frontend/src/components/shared/VehicleIcon.tsx` | Phase 6.11 |
| `docs/notes/planForEnhancement.md` | This plan |
