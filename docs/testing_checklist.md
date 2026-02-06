# PharmaFleet Testing Checklist

This document lists all features to be tested for the PharmaFleet system, divided into the Admin Dashboard and Driver Mobile Application.

## 1. Admin Dashboard

### 1.1 Authentication & Security

- [ ] **Login:** Verify efficient login with valid credentials (username/password).
- [ ] **Login Error Handling:** Verify error messages for invalid credentials.
- [ ] **Logout:** Verify successful logout and redirection to login page.
- [ ] **Password Reset:** Verify the password reset flow.
- [ ] **Route Protection:** Try accessing dashboard pages without logging in (should redirect to login).
- [ ] **RBAC (Super Admin):** Verify full access to all modules (Users, Drivers, Orders, Settings).
- [ ] **RBAC (Warehouse Manager):** Verify access is limited to assigned warehouse data only.
- [ ] **RBAC (Dispatcher):** Verify order assignment capabilities across warehouses but no user management.
- [ ] **RBAC (Executive):** Verify read-only access to dashboards and reports.

### 1.2 Dashboard Home

- [ ] **KPI Cards:** Verify "Orders Today", "Active Drivers", "Success Rate" metrics display correct data.
- [ ] **Recent Activity:** Verify the timeline updates with recent events.
- [ ] **Auto-Refresh:** Verify the dashboard data refreshes automatically.

### 1.3 Order Management

- [ ] **Import Orders (Excel):**
  - [ ] successfully upload a valid Excel file.
  - [ ] Verify validation ensures required columns exist.
  - [ ] Verify duplicate sales order numbers are detected and flagged.
- [ ] **Order List:**
  - [ ] Verify all orders are listed with correct columns (Order #, Customer, Amount, Status, Driver).
  - [ ] Verify pagination works.
- [ ] **Filtering:**
  - [ ] Filter by **Warehouse**.
  - [ ] Filter by **Driver**.
  - [ ] Filter by **Status** (e.g., Unassigned, Delivered).
  - [ ] Filter by **Date Range**.
- [ ] **Search:** Search by Sales Order #, Customer Name, and Phone Number.
- [ ] **Order Details:** Click an order to view full details (Customer info, history, POD).
- [ ] **Single Assignment:** Assign a single unassigned order to an available driver.
- [ ] **Batch Assignment:** Select multiple orders and assign them to one driver.
- [ ] **Reassignment:** Reassign an order from Driver A to Driver B.
- [ ] **Unassign:** Remove a driver from an order (return to unassigned).
- [ ] **Cancel Order:** Verify order cancellation logic.
- [ ] **Export:** Export filtered order list to Excel/CSV.

### 1.4 Real-time Map View

- [ ] **Map Loading:** Verify map loads with Google Maps integration.
- [ ] **Driver Markers:** Verify online drivers appear as customized markers (color-coded by status).
- [ ] **Warehouse Markers:** Verify warehouse locations are plotted.
- [ ] **Live Updates:** Verify driver positions update in real-time (via WebSocket).
- [ ] **Sidebar Interaction:** Click a driver in the sidebar to focus the map on them.
- [ ] **Popups:** Click a marker to see driver/order details.

### 1.5 Driver Management

- [ ] **Driver List:** View all drivers with their current status (Online/Offline/Busy).
- [ ] **Create Driver:** Add a new driver (Biometric ID, Vehicle Info, Location).
- [ ] **Update Driver:** Edit an existing driver's details.
- [ ] **Driver Details:** View profile, assigned orders history, and performance stats.
- [ ] **Location History:** View a driver's historical route/locations.

### 1.6 Payment Management

- [ ] **Pending Payments:** List payments collected by drivers waiting for clearance.
- [ ] **Verify & Clear:** detailed check of a payment and marking it as "Cleared".
- [ ] **Payment Reports:** View specific reports on collected cash/Knet.

### 1.7 Analytics & Reports

- [ ] **Charts:** Verify Bar/Pie charts render correctly.
- [ ] **Deliveries per Driver:** Check the count accuracy.
- [ ] **Average Delivery Time:** Check calculation accuracy.
- [ ] **Performance Comparison:** Verify the ranking table.
- [ ] **Warehouse Reports:** specific metrics by warehouse.
- [ ] **Executive Dashboard:** Verify high-level read-only view.

### 1.8 User Management

- [ ] **User List:** View all dashboard users.
- [ ] **Create User:** Create a new manager/dispatcher with specific roles.
- [ ] **Edit User:** Change an existing user's role or details.

### 1.9 Notifications

- [ ] **Real-time Alerts:** Verify toast notifications for urgent events (e.g., Order Rejected).
- [ ] **Notification List:** View past notifications in the dropdown/page.
- [ ] **Mark as Read:** Verify unread count decreases.

### 1.10 Settings

- [ ] **Profile:** Update own user profile.
- [ ] **Language:** Switch between English and Arabic (Verify RTL layout).

---

## 2. Driver Mobile App

### 2.1 Authentication

- [ ] **Login:** Successful login with driver credentials.
- [ ] **Keep me logged in:** Restart app and verify session persists.
- [ ] **Logout:** Successful logout.

### 2.2 Home & Status

- [ ] **Status Toggle:**
  - [ ] Switch to **Online** (Should start location tracking).
  - [ ] Switch to **Busy**.
  - [ ] Switch to **Offline** (Should stop tracking).
- [ ] **Dashboard:** View summary of active tasks.

### 2.3 Order List

- [ ] **View Assignments:** Verify new assigned orders appear immediately (Push Notification).
- [ ] **Order Cards:** Check details on card (Name, Status color, Address).
- [ ] **Pull-to-Refresh:** Verify manual sync works.

### 2.4 Order Details & Actions

- [ ] **Order Info:** View full customer details, items, payment required.
- [ ] **Call Customer:** Tapping phone icon launches dialer.
- [ ] **Navigation:** Tapping navigate icon launches Google Maps with coordinates.

### 2.5 Order Lifecycle Flow

- [ ] **Receive:** Mark order as "Received" (at pharmacy).
- [ ] **Pick Up:** Mark order as "Picked Up".
- [ ] **On the Way:** Mark status when starting journey.
- [ ] **Reject Order:**
  - [ ] Select "Reject".
  - [ ] Enter reason.
  - [ ] Verify it disappears from list and notifies admin.

### 2.6 Delivery Completion (Proof of Delivery)

- [ ] **Complete Delivery:** Tap "Deliver".
- [ ] **Payment Collection:**
  - [ ] Select method (Cash/Knet/Link).
  - [ ] Input amount (if Cash).
- [ ] **Proof of Delivery (POD):**
  - [ ] **Signature:** Sign on screen and save.
  - [ ] **Photo:** Take a picture using camera and save.
- [ ] **Submit:** Verify order moves to "Completed" history.

### 2.7 Offline Mode

- [ ] **View Offline:** Turn off data; verify assigned orders are still visible.
- [ ] **Local Updates:** Update status or take POD while offline (should queue).
- [ ] **Sync:** Turn on data; verify queued updates are sent to server automatically.

### 2.8 Settings

- [ ] **Language:** Toggle between Arabic and English.
- [ ] **RTL Support:** Verify UI layout flips correctly for Arabic.
