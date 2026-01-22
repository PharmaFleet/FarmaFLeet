# PharmaFleet Manager Manual

## Quick Start Guide

### Logging In

1. Open your browser and navigate to the PharmaFleet Dashboard URL
2. Enter your email and password
3. Click **Login**

---

## Dashboard Overview

Upon login, you'll see the main dashboard with:

- **Order Summary Cards**: Today's orders, active deliveries, success rate
- **Live Map**: Real-time driver locations
- **Recent Activity**: Latest order status changes

---

## Managing Orders

### Importing Orders from Excel

1. Click **Import Orders** button (top right)
2. Select your Excel file exported from Dynamics 365
3. Review the preview showing detected orders
4. Yellow rows indicate **duplicates** - review these carefully
5. Click **Confirm Import** to add orders

**Required Excel Columns:**
| Column | Description |
|--------|-------------|
| Sales Order | Order number (SO-XXXXX) |
| Created Date | Order creation date |
| Customer Name | Customer's full name |
| Customer Phone | Contact number |
| Customer Address | Delivery address |
| Total Amount | Order value in KWD |
| Warehouse Code | Origin warehouse (DW001, etc.) |

### Filtering Orders

Use the filter bar above the order list:

- **Status**: Pending, Assigned, Delivered, etc.
- **Warehouse**: Filter by origin pharmacy
- **Driver**: Filter by assigned driver
- **Date Range**: Custom date selection

### Searching Orders

Type in the search box to find orders by:

- Sales Order Number
- Customer Name
- Customer Phone

---

## Assigning Orders

### Single Assignment

1. Click on an **unassigned** order
2. Click **Assign Driver**
3. Select a driver from the list (green = online, gray = offline)
4. Confirm assignment

### Batch Assignment

1. Check the boxes next to multiple orders
2. Click **Batch Assign** button
3. Select the target driver
4. Confirm - all selected orders will be assigned

### Reassigning Orders

1. Click on an **assigned** order
2. Click **Reassign**
3. Select the new driver
4. Optionally enter a reason
5. Confirm

---

## Live Map View

The map shows:

- **Green drivers**: Online and available
- **Yellow drivers**: Busy (has active orders)
- **Gray drivers**: Offline
- **Building icons**: Warehouse locations

**Actions from map:**

- Click a driver to see their assigned orders
- Click a warehouse to see pending orders
- Use zoom controls to focus on areas

---

## Handling Rejections

When a driver rejects an order:

1. You'll receive a **notification** (bell icon)
2. Order returns to **Unassigned** status
3. Click the order to see the rejection reason
4. Reassign to another driver as needed

---

## Payment Management

### Viewing Pending Payments

1. Go to **Payments** → **Pending**
2. See all collected but unverified payments
3. Group by driver for easy verification

### Clearing Payments

After driver returns and submits collected cash:

1. Find the payment in the pending list
2. Verify the amount matches
3. Click **Clear** to mark as verified

---

## Analytics & Reports

### Available Reports

| Report                | Description                 |
| --------------------- | --------------------------- |
| Deliveries per Driver | Order counts by driver      |
| Average Delivery Time | Time from assign to deliver |
| Success Rate          | % of successful deliveries  |
| Orders by Warehouse   | Distribution by pharmacy    |

### Exporting Data

1. Apply desired filters
2. Click **Export** button
3. Select format (Excel/PDF)
4. Download the file

---

## User Management (Admin Only)

### Adding a New Driver

1. Go to **Settings** → **Users**
2. Click **Add Driver**
3. Fill in: Name, Email, Phone, Vehicle Info
4. Assign to a warehouse
5. Set temporary password
6. Save

### Adding a Manager

1. Go to **Settings** → **Users**
2. Click **Add User**
3. Select role:
   - **Dispatcher**: All warehouses, assignment only
   - **Warehouse Manager**: Single warehouse access
   - **Executive**: Read-only analytics
4. Fill in details and save

---

## Notifications

The bell icon (🔔) shows unread notifications:

- **Order Rejected**: Driver couldn't complete delivery
- **Driver Offline**: Driver with orders went offline
- **Import Complete**: Excel import finished

Click a notification to see details and take action.

---

## Keyboard Shortcuts

| Shortcut | Action       |
| -------- | ------------ |
| `/`      | Focus search |
| `Esc`    | Close modal  |
| `R`      | Refresh data |

---

## Troubleshooting

### "Order import failed"

- Check Excel file format matches expected columns
- Ensure no empty rows in the middle of data

### "Cannot assign order"

- Verify order is in "Pending" status
- Check driver is online

### "Map not loading"

- Check internet connection
- Refresh the page (F5)

---

## Support

For technical issues: support@pharmafleet.com

For urgent matters: Call your system administrator
