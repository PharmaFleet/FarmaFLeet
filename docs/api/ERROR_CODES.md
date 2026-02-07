# PharmaFleet Error Codes Reference

This document lists all error codes and exceptions used in the PharmaFleet API.

## Error Response Format

All errors follow this JSON structure:

```json
{
  "detail": "Error message describing what went wrong"
}
```

For PharmaFleet-specific exceptions, the response may include:

```json
{
  "detail": "Error message",
  "error_code": "SPECIFIC_ERROR_CODE"
}
```

## PharmaFleet Exception Hierarchy

These are application-specific exceptions defined in `backend/app/core/exceptions.py`.

### ORDER_NOT_FOUND

| Property | Value |
|----------|-------|
| HTTP Status | 404 Not Found |
| Error Code | `ORDER_NOT_FOUND` |
| Description | The requested order does not exist |

**When it occurs:**
- Getting order by ID that doesn't exist
- Updating status of non-existent order
- Assigning driver to non-existent order

**Client handling:**
```javascript
if (error.status === 404 && error.data?.error_code === 'ORDER_NOT_FOUND') {
  // Order was deleted or ID is incorrect
  router.navigate('/orders');
}
```

---

### INVALID_STATUS_TRANSITION

| Property | Value |
|----------|-------|
| HTTP Status | 400 Bad Request |
| Error Code | `INVALID_STATUS_TRANSITION` |
| Description | The requested status change is not allowed |

**When it occurs:**
- Trying to mark a PENDING order as DELIVERED (must go through ASSIGNED first)
- Trying to cancel an already DELIVERED order
- Invalid status workflow transition

**Valid status transitions:**
```
pending -> assigned -> picked_up -> in_transit -> out_for_delivery -> delivered
                                                                   -> rejected
                                                                   -> returned
pending -> cancelled
assigned -> cancelled
```

**Client handling:**
```javascript
if (error.data?.error_code === 'INVALID_STATUS_TRANSITION') {
  toast.error('Cannot change order status. Check the order workflow.');
}
```

---

### WAREHOUSE_ACCESS_DENIED

| Property | Value |
|----------|-------|
| HTTP Status | 403 Forbidden |
| Error Code | `WAREHOUSE_ACCESS_DENIED` |
| Description | User does not have permission to access this warehouse's resources |

**When it occurs:**
- Accessing orders from a warehouse the user is not assigned to
- Batch operations spanning warehouses the user cannot access
- Driver trying to access orders from another warehouse

**Client handling:**
```javascript
if (error.data?.error_code === 'WAREHOUSE_ACCESS_DENIED') {
  toast.error('You do not have access to this warehouse.');
}
```

---

### DRIVER_NOT_FOUND

| Property | Value |
|----------|-------|
| HTTP Status | 404 Not Found |
| Error Code | `DRIVER_NOT_FOUND` |
| Description | The specified driver does not exist |

**When it occurs:**
- Assigning order to non-existent driver
- Getting driver profile that doesn't exist
- Driver endpoint called but user has no driver profile

**Client handling:**
```javascript
if (error.data?.error_code === 'DRIVER_NOT_FOUND') {
  // Refresh driver list
  await refetchDrivers();
}
```

---

### DRIVER_NOT_AVAILABLE

| Property | Value |
|----------|-------|
| HTTP Status | 400 Bad Request |
| Error Code | `DRIVER_NOT_AVAILABLE` |
| Description | The driver is not available for assignment |

**When it occurs:**
- Assigning order to offline driver
- Driver is marked as unavailable
- Driver account is inactive

**Client handling:**
```javascript
if (error.data?.error_code === 'DRIVER_NOT_AVAILABLE') {
  toast.warn('Driver is currently unavailable. Select another driver.');
}
```

---

### INVALID_FILE_FORMAT

| Property | Value |
|----------|-------|
| HTTP Status | 400 Bad Request |
| Error Code | `INVALID_FILE_FORMAT` |
| Description | The uploaded file format is not supported |

**When it occurs:**
- Uploading non-Excel file to import endpoint
- File is corrupted or cannot be parsed
- File extension not in allowed list

**Supported formats:**
- `.xlsx` - Excel 2007+ (preferred)
- `.xls` - Excel 97-2003
- `.csv` - Comma-separated values
- HTML tables (for copy-paste from web)

**Client handling:**
```javascript
if (error.data?.error_code === 'INVALID_FILE_FORMAT') {
  toast.error('Please upload a valid Excel file (.xlsx or .xls)');
}
```

---

## Standard HTTP Errors

### 400 Bad Request

Generic client error for malformed requests.

| Error Message | Description |
|---------------|-------------|
| `"Incorrect email or password"` | Login credentials are wrong |
| `"Inactive user"` | User account is disabled |
| `"Cannot cancel a delivered order"` | Status transition not allowed |
| `"Order is already cancelled"` | Duplicate operation |
| `"Only delivered orders can be returned"` | Wrong status for return |
| `"User with this email already exists"` | Duplicate email |
| `"Driver profile already exists for this user"` | Duplicate driver |
| `"Warehouse with this code already exists"` | Duplicate warehouse code |
| `"Uploaded file is empty"` | Empty file upload |
| `"File too large. Maximum size is 10MB"` | File size exceeded |

---

### 401 Unauthorized

Authentication failed or token invalid.

| Error Message | Description |
|---------------|-------------|
| `"Could not validate credentials"` | JWT invalid or expired |
| `"Token has been invalidated"` | Token was logged out/blacklisted |
| `"Missing authorization header"` | No Authorization header |
| `"Invalid authorization header format"` | Not "Bearer <token>" format |
| `"Invalid cron secret"` | Cron job authentication failed |

---

### 403 Forbidden

User authenticated but lacks permission.

| Error Message | Description |
|---------------|-------------|
| `"The user doesn't have enough privileges"` | Role check failed |
| `"Only administrators can perform this action"` | Admin-only endpoint |
| `"Only managers and administrators can perform this action"` | Manager+ required |
| `"Only dispatchers, managers, and administrators can perform this action"` | Dispatcher+ required |
| `"Only drivers can pickup orders"` | Driver-only endpoint |
| `"Only drivers can deliver orders"` | Driver-only endpoint |
| `"Order is not assigned to you"` | Driver accessing another's order |
| `"You don't have access to orders from this warehouse"` | Warehouse access denied |
| `"You don't have access to this order"` | Order access denied |
| `"You don't have permission to view other users"` | User access denied |
| `"Cannot delete your own account"` | Self-deletion prevention |
| `"Cannot delete other super_admin users"` | Admin protection |

---

### 404 Not Found

Resource does not exist.

| Error Message | Description |
|---------------|-------------|
| `"Order not found"` | Order ID doesn't exist |
| `"Driver not found"` | Driver ID doesn't exist |
| `"Driver profile not found"` | User has no driver profile |
| `"User not found"` | User ID doesn't exist |
| `"Warehouse not found"` | Warehouse ID doesn't exist |
| `"Payment not found"` | Payment ID doesn't exist |
| `"Notification not found"` | Notification ID doesn't exist |

---

### 429 Too Many Requests

Rate limit exceeded.

| Error Message | Description |
|---------------|-------------|
| `"Too many login attempts. Please try again later."` | Login rate limited |

**Rate limits:**
- Login: 5 requests/minute per IP
- Import: 10 requests/5 minutes
- Export: 5 requests/minute

---

### 500 Internal Server Error

Server-side error.

| Error Message | Description |
|---------------|-------------|
| `"Failed to upload file to cloud storage"` | Supabase upload failed |
| `"Failed to upload photo to storage"` | POD photo upload failed |
| `"Error loading profile: <details>"` | Driver profile fetch error |
| `"Could not upload file: <details>"` | Generic upload error |
| `"Import failed: <details>"` | Excel import error |

---

## Batch Operation Errors

Batch endpoints return partial success with error arrays:

```json
{
  "processed": 3,
  "errors": [
    {"order_id": 123, "error": "Order not found"},
    {"order_id": 456, "error": "Cannot cancel a delivered order"},
    {"order_id": 789, "error": "No access to this warehouse"}
  ]
}
```

### Common Batch Errors

| Error | Description |
|-------|-------------|
| `"Order not found"` | Order ID doesn't exist |
| `"No access to this warehouse"` | User lacks warehouse permission |
| `"Cannot cancel a delivered order"` | Invalid status transition |
| `"Order is already cancelled"` | Duplicate operation |
| `"Order is not assigned to you"` | Driver accessing another's order |
| `"Order must be in ASSIGNED status"` | Wrong status for pickup |
| `"Only delivered orders can be returned"` | Wrong status for return |

---

## Import Errors

Order import returns row-level errors:

```json
{
  "created": 45,
  "errors": [
    {"row": 3, "error": "Missing 'Sales order' column or value"},
    {"row": 12, "error": "Order SO-12345 already exists"}
  ]
}
```

### Common Import Errors

| Error | Description |
|-------|-------------|
| `"Missing 'Sales order' column or value"` | Required column missing |
| `"Order <number> already exists"` | Duplicate order number |
| `"Could not parse file"` | Invalid file format |

---

## Sync Errors (Mobile App)

Offline sync returns operation-level errors:

```json
{
  "processed": 5,
  "errors": [
    {"order_id": 123, "error": "Invalid status: INVALID"},
    {"order_id": 456, "error": "Order not assigned to you"}
  ]
}
```

### Common Sync Errors

| Error | Description |
|-------|-------------|
| `"Invalid status: <value>"` | Status enum value not valid |
| `"Order not found"` | Order was deleted |
| `"Order not assigned to you"` | Driver trying to sync another's order |
| `"Only drivers can sync status updates"` | Non-driver calling sync endpoint |
| `"Driver profile not found"` | User has no driver profile |

---

## Error Handling Best Practices

### 1. Always Check Status Code First

```javascript
try {
  await api.orders.get(orderId);
} catch (error) {
  if (error.status === 404) {
    // Order doesn't exist
  } else if (error.status === 403) {
    // No permission
  } else if (error.status === 401) {
    // Token expired, try refresh
  } else {
    // Generic error handling
  }
}
```

### 2. Handle Rate Limits with Retry

```javascript
async function fetchWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Display User-Friendly Messages

```javascript
const ERROR_MESSAGES = {
  'ORDER_NOT_FOUND': 'This order no longer exists.',
  'DRIVER_NOT_AVAILABLE': 'This driver is currently offline.',
  'WAREHOUSE_ACCESS_DENIED': 'You do not have access to this warehouse.',
  'INVALID_STATUS_TRANSITION': 'This status change is not allowed.',
};

function getErrorMessage(error) {
  const code = error.data?.error_code;
  return ERROR_MESSAGES[code] || error.data?.detail || 'An error occurred.';
}
```

### 4. Log Errors for Debugging

```javascript
catch (error) {
  console.error('[API Error]', {
    status: error.status,
    code: error.data?.error_code,
    detail: error.data?.detail,
    endpoint: error.config?.url,
  });
}
```
