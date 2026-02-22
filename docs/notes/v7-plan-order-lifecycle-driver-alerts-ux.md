# PharmaFleet v7: Order Lifecycle, Driver Shift Alerts & UX Improvements

## Context

PharmaFleet has 11,000 orders in the system with only 177 delivered (~1.6% success rate). The root cause is **order data accumulation without lifecycle management**: orders are imported daily from Microsoft Dynamics 365 Excel exports, duplicates are correctly skipped by `sales_order_number`, but old pending/assigned orders that were never processed remain in the system forever. The only cleanup mechanism (`auto-archive` cron) only handles delivered orders.

This means the Orders page shows all 11,000 orders by default, making it overwhelming and slow. Managers import new batches daily and can't easily distinguish today's work from months-old stale data.

Additionally, drivers who stay online for extended shifts (10+ hours) need periodic reminders to go offline if they're done working.

---

## Feature 1: Order Lifecycle Management (The Core Fix)

### Problem
- Orders go `pending` on import and stay there forever if never assigned/delivered
- No mechanism to expire, clean up, or segregate stale orders
- Default view shows ALL 11,000 non-archived orders with no time scoping
- The `success_rate` metric on dashboard only checks today's data but says "All time"

### Solution

#### 1A. Auto-Expire Stale Orders (Backend Cron)

**New cron endpoint**: `POST /api/v1/cron/auto-expire-stale`
- Runs daily at 4 AM UTC (after auto-archive at 2 AM)
- Finds orders with status `pending` or `assigned` where `created_at < now - 7 days`
- Changes status to `cancelled` with notes = "Auto-cancelled: stale order (7+ days without progress)"
- Creates `OrderStatusHistory` entry for audit trail
- Returns count of expired orders

**Files to modify:**
- `backend/app/api/v1/endpoints/cron.py` — add new endpoint
- `vercel.json` — add cron schedule entry

#### 1B. "Today" Default View (Frontend)

Change the Orders page to default to showing **today's orders only** instead of all orders.

**Add quick date range buttons** above the table: `Today | This Week | This Month | All Time`
- Default selection: **Today** (sets `date_from` to today's date, `date_field=created_at`)
- "All Time" removes the date filter (current behavior)
- Persisted to localStorage so the preference sticks

**Files to modify:**
- `frontend/src/pages/orders/OrdersPage.tsx` — add date range quick-select, change default state

#### 1C. Import Summary Enhancement (Frontend + Backend)

After Excel import, show a richer summary card:
- "X new orders imported" (already exists)
- **Add**: "Y total pending orders today" and "Z unassigned orders"
- **Add**: Quick action button "Assign pending orders" that filters to today's pending

**Files to modify:**
- `frontend/src/pages/orders/OrdersPage.tsx` — enhance import success toast to show summary with action

#### 1D. Fix Dashboard Success Rate

The dashboard currently calculates success rate from today's orders only (`created_at >= today_start`) but displays it as "All time". Fix to show **both**:
- Today's rate as "Today"
- All-time rate (delivered / total non-archived) as a secondary metric

**Files to modify:**
- `backend/app/api/v1/endpoints/analytics.py` — add `all_time_success_rate` to executive-dashboard response
- `frontend/src/pages/dashboard/DashboardHome.tsx` — update success rate card to show "Today" label

#### 1E. Bulk Stale Order Cleanup (One-Time + Ongoing Tool)

Add a manager action to the Orders page: **"Cancel Stale Orders"** button (visible when filter = "All Time" or older dates).
- Opens a confirmation dialog: "Cancel X pending orders older than 7 days?"
- Calls a new backend endpoint: `POST /api/v1/orders/batch-cancel-stale`
- Only cancels `pending` status orders (not assigned, which have a driver working them)

**Files to modify:**
- `backend/app/api/v1/endpoints/orders.py` — add `batch-cancel-stale` endpoint
- `frontend/src/pages/orders/OrdersPage.tsx` — add cleanup button + confirmation dialog

---

## Feature 2: Driver 10-Hour Shift Notification

### Problem
45 active drivers may stay "online" beyond their shift. No reminder system exists. The existing 12-hour check in `update_location` (drivers.py:500-509) only triggers on location updates and has no throttling.

### Solution

#### 2A. Hourly Cron Job for Shift Reminders

**New cron endpoint**: `POST /api/v1/cron/check-driver-shifts`
- Runs every hour (`0 * * * *`)
- Queries all drivers where `is_available = true` AND `last_online_at` is set
- For drivers online **10+ hours**: send FCM push notification
- **Throttle**: Use Redis key `shift_notif:{driver_id}:{hour}` with 1-hour TTL to prevent duplicate notifications within the same hour
- Message: "You've been online for X hours. Still on shift? Open the app to confirm, or go offline if you're done."

**Files to modify:**
- `backend/app/api/v1/endpoints/cron.py` — add new endpoint
- `backend/app/services/notification.py` — update `notify_driver_shift_limit` message (change from 12h to 10h wording, make hours dynamic)
- `vercel.json` — add hourly cron schedule

#### 2B. Update Existing 12h Check

Update the inline shift check in `drivers.py:update_location` to align with the new 10-hour threshold and delegate to the cron job instead of notifying inline (remove the inline notification to avoid double-notifying).

**Files to modify:**
- `backend/app/api/v1/endpoints/drivers.py` — remove inline shift notification from `update_location` (cron handles it now)

---

## Feature 3: UX Simplification

### Problem
Users report the system is "very hard to use, complex, and slow." Key pain points:
- Orders page shows 15+ columns with drag-and-drop handles and resize handles on every column
- 11,000 orders load by default (even paginated, the total count is overwhelming)
- Analytics page shows hardcoded mock data, not real metrics
- Dashboard success rate is misleading

### Solution

#### 3A. Simplified Default Column Set

Reduce the default visible columns to **8 essential ones**:
`SO# | Customer | Status | Driver | Warehouse | Amount | Created | Actions`

Move these to "hidden by default" (accessible via column toggle):
`Address | Driver Mobile | Driver Code | Payment | Sales Taker | Assigned | Picked Up | Delivered | Delivery Time`

Add a **"Show All Columns"** toggle button in the toolbar.

**Files to modify:**
- `frontend/src/hooks/useColumnOrder.ts` — update default column visibility

#### 3B. Increase Default Page Size

Change default page size from 10 to **50** for less pagination clicking.

**Files to modify:**
- `frontend/src/pages/orders/OrdersPage.tsx` — change `useState<number>(10)` to `useState<number>(50)`

#### 3C. Actionable Dashboard

Enhance the dashboard with actionable cards that link directly to filtered views:
- "Unassigned Orders Today: X" → clicks to Orders page filtered to pending + today
- "Active Drivers: X" → clicks to Drivers page filtered to online
- Fix "Success Rate" to show today's rate accurately

**Files to modify:**
- `frontend/src/pages/dashboard/DashboardHome.tsx` — make stat cards clickable with navigation
- `backend/app/api/v1/endpoints/analytics.py` — add `unassigned_today` count to metrics

#### 3D. Fix Analytics Page Mock Data

Replace hardcoded mock charts with real data from existing backend endpoints:
- Use `/analytics/driver-performance` for the driver performance chart (already exists)
- Use `/analytics/orders-by-warehouse` for warehouse breakdown (already exists)
- Add a new `/analytics/daily-orders` endpoint for the weekly trend chart

**Files to modify:**
- `frontend/src/pages/analytics/AnalyticsPage.tsx` — wire up real data
- `frontend/src/services/analyticsService.ts` — add service methods for existing endpoints
- `backend/app/api/v1/endpoints/analytics.py` — add `daily-orders` endpoint (7-day history)

---

## Implementation Order (Orchestrated)

### Phase 1: Backend Foundation (cron jobs + endpoints)
1. Add auto-expire stale orders cron (`cron.py`)
2. Add driver shift check cron (`cron.py`)
3. Update notification service message (`notification.py`)
4. Add batch-cancel-stale endpoint (`orders.py`)
5. Fix dashboard metrics + add daily-orders endpoint (`analytics.py`)
6. Update `vercel.json` with new cron schedules
7. Remove inline shift check from `drivers.py`

### Phase 2: Frontend UX
1. Add date range quick-select to Orders page (Today default)
2. Simplify default columns
3. Increase default page size to 50
4. Add "Cancel Stale Orders" button
5. Make dashboard cards actionable (clickable)
6. Fix analytics page to use real data
7. Enhance import summary

### Phase 3: Testing + Review
1. Add backend tests for new cron jobs and endpoints
2. Add frontend tests for new UI elements
3. Code review pass
4. Security review (cron auth, batch operations)

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `backend/app/api/v1/endpoints/cron.py` | Add auto-expire + driver shift cron |
| `backend/app/api/v1/endpoints/orders.py` | Add batch-cancel-stale endpoint |
| `backend/app/api/v1/endpoints/analytics.py` | Fix metrics, add daily-orders |
| `backend/app/api/v1/endpoints/drivers.py` | Remove inline shift check |
| `backend/app/services/notification.py` | Update shift message, make hours dynamic |
| `vercel.json` | Add 2 new cron entries |
| `frontend/src/pages/orders/OrdersPage.tsx` | Date quick-select, default columns, page size, cleanup button |
| `frontend/src/pages/dashboard/DashboardHome.tsx` | Actionable cards, fix success rate |
| `frontend/src/pages/analytics/AnalyticsPage.tsx` | Replace mock data with real endpoints |
| `frontend/src/services/analyticsService.ts` | Add service methods |
| `frontend/src/hooks/useColumnOrder.ts` | Update default visible columns |

## Reusable Existing Code

- `NotificationService.notify_driver_shift_limit()` in `notification.py:239` — already exists, just needs message update
- `verify_cron_secret()` in `cron.py:31` — reuse for new cron endpoints
- `OrderStatusHistory` model — reuse for audit trail on auto-expired orders
- Existing `batch-cancel` endpoint pattern in `orders.py` — follow same pattern for batch-cancel-stale
- `analyticsService.ts` — extend with new methods
- Redis client in `drivers.py:53` — reuse for notification throttling

## Verification

1. **Backend tests**: `pytest tests/test_endpoints.py -v` — verify new endpoints
2. **Frontend tests**: `npm run test` — verify UI changes
3. **Manual test cron**: Call `/api/v1/cron/auto-expire-stale` and `/api/v1/cron/check-driver-shifts` with CRON_SECRET header
4. **Import flow**: Import an Excel file, verify today's filter shows only new orders
5. **Dashboard**: Verify success rate shows accurate "Today" label
6. **Analytics**: Verify charts show real data instead of mock
