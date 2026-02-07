# PharmaFleet API Documentation

This directory contains comprehensive API documentation for the PharmaFleet Delivery Management System.

## Documentation Files

| File | Description |
|------|-------------|
| [AUTHENTICATION.md](./AUTHENTICATION.md) | Login flow, token refresh, mobile auth, rate limits |
| [ERROR_CODES.md](./ERROR_CODES.md) | All error codes and how to handle them |
| [PharmaFleet.postman_collection.json](./PharmaFleet.postman_collection.json) | Postman collection with all endpoints |
| [PharmaFleet.postman_environment.json](./PharmaFleet.postman_environment.json) | Postman environment variables |

## Quick Start

### 1. Import into Postman

1. Open Postman
2. Click **Import** > **File**
3. Select `PharmaFleet.postman_collection.json`
4. Import `PharmaFleet.postman_environment.json` as well
5. Select "PharmaFleet Dev" environment in the top-right dropdown

### 2. Login

Use the **Auth > Login** request with your credentials. The access token is automatically saved to environment variables.

### 3. Make Requests

All authenticated endpoints will automatically use the saved token.

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://pharmafleet-olive.vercel.app/api/v1` |
| Development | `http://localhost:8000/api/v1` |

## API Sections

### Authentication (`/login`, `/auth/*`)
- Login with email/password
- Refresh access tokens
- Register FCM tokens for push notifications
- Logout (blacklist token)

### Orders (`/orders/*`)
- List, create, import, export orders
- Assign/reassign drivers
- Update status (pending -> assigned -> picked_up -> delivered)
- Upload proof of delivery
- Batch operations (cancel, delete, pickup, delivery, return)

### Drivers (`/drivers/*`)
- List, create, update drivers
- Get driver location and stats
- Update availability status
- Driver's own orders and delivery history

### Users (`/users/*`)
- List, create, update, delete users
- Get current user profile

### Warehouses (`/warehouses/*`)
- List, create, update, delete warehouses

### Payments (`/payments/*`)
- List payments, pending payments
- Record payment collection
- Verify/clear payments
- Export payment report

### Analytics (`/analytics/*`)
- Executive dashboard
- Driver performance
- Orders by warehouse
- Recent activities

### Notifications (`/notifications/*`)
- List user notifications
- Mark as read
- Clear notifications

### Sync (`/sync/*`)
- Offline sync for mobile app
- Sync status updates
- Sync proof of delivery

### Upload (`/upload`)
- Upload files to Supabase Storage

### Cron (`/cron/*`)
- Auto-archive orders (internal, requires CRON_SECRET)
- Cleanup old driver locations

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "items": [...],       // For paginated lists
  "total": 100,
  "page": 1,
  "size": 10,
  "pages": 10
}
```

### Error Response
```json
{
  "detail": "Error message here"
}
```

### Batch Operation Response
```json
{
  "processed": 5,
  "errors": [
    {"order_id": 123, "error": "Order not found"}
  ]
}
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/login/access-token` | 5 requests/minute |
| `/orders/import` | 10 requests/5 minutes |
| `/orders/export` | 5 requests/minute |

See [AUTHENTICATION.md](./AUTHENTICATION.md) for more details.

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `super_admin` | Full system access | All warehouses, all operations |
| `warehouse_manager` | Warehouse management | Assigned warehouse(s), driver management |
| `dispatcher` | Order dispatch | Order assignment, driver status |
| `executive` | View-only analytics | Dashboard, reports |
| `driver` | Mobile app user | Own orders, location updates |

## Common Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

For file uploads:
```http
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```
