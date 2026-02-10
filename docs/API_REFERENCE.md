# PharmaFleet API Reference

## Overview

PharmaFleet API is built with **FastAPI** and follows RESTful conventions. The API is versioned under `/api/v1`.

## Base URL

| Environment       | URL                                          |
| ----------------- | -------------------------------------------- |
| Local Development | `http://localhost:8000/api/v1`               |
| Staging           | `https://api-staging.pharmafleet.com/api/v1` |
| Production        | `https://api.pharmafleet.com/api/v1`         |

## Interactive Documentation

FastAPI provides built-in interactive documentation:

- **Swagger UI**: `{BASE_URL}/docs`
- **ReDoc**: `{BASE_URL}/redoc`
- **OpenAPI JSON**: `{BASE_URL}/openapi.json`

---

## Authentication

### Login

```http
POST /login/access-token
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=yourpassword
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

---

## Endpoints Summary

### Authentication & Users

| Method   | Endpoint              | Description               |
| -------- | --------------------- | ------------------------- |
| POST     | `/login/access-token` | User login                |
| POST     | `/auth/refresh`       | Refresh token             |
| POST     | `/auth/logout`        | Logout                    |
| GET      | `/users/me`           | Current user profile      |
| GET/POST | `/users/`             | List/Create users (Admin) |

### Orders

| Method | Endpoint                         | Description              |
| ------ | -------------------------------- | ------------------------ |
| GET    | `/orders/`                       | List orders with filters |
| GET    | `/orders/{id}`                   | Order details            |
| POST   | `/orders/import`                 | Import from Excel        |
| POST   | `/orders/export`                 | Export to Excel          |
| POST   | `/orders/{id}/assign`            | Assign to driver         |
| POST   | `/orders/batch-assign`           | Batch assign             |
| POST   | `/orders/{id}/reassign`          | Reassign                 |
| POST   | `/orders/{id}/unassign`          | Unassign                 |
| PATCH  | `/orders/{id}/status`            | Update status (Mobile)   |
| POST   | `/orders/{id}/reject`            | Reject order (Mobile)    |
| POST   | `/orders/{id}/proof-of-delivery` | Upload POD               |
| GET    | `/orders/{id}/status-history`    | Status history           |

### Drivers

| Method | Endpoint                         | Description                 |
| ------ | -------------------------------- | --------------------------- |
| GET    | `/drivers/`                      | List drivers                |
| POST   | `/drivers/`                      | Create driver (Admin)       |
| PUT    | `/drivers/{id}`                  | Update driver               |
| PATCH  | `/drivers/{id}/status`           | Update availability         |
| GET    | `/drivers/{id}/orders`           | Driver's assigned orders    |
| GET    | `/drivers/{id}/delivery-history` | Delivery history            |
| POST   | `/drivers/location`              | Update location (Mobile)    |
| GET    | `/drivers/locations`             | All online driver locations |
| WS     | `/drivers/ws/location-updates`   | WebSocket for real-time     |

### Payments

| Method | Endpoint                          | Description             |
| ------ | --------------------------------- | ----------------------- |
| GET    | `/payments/pending`               | Pending collections     |
| POST   | `/orders/{id}/payment-collection` | Record collection       |
| POST   | `/payments/{id}/clear`            | Clear payment (Manager) |
| GET    | `/payments/report`                | Payment report          |

### Analytics

| Method | Endpoint                           | Description           |
| ------ | ---------------------------------- | --------------------- |
| GET    | `/analytics/deliveries-per-driver` | Deliveries per driver |
| GET    | `/analytics/average-delivery-time` | Average delivery time |
| GET    | `/analytics/success-rate`          | Success rate          |
| GET    | `/analytics/driver-performance`    | Driver comparison     |
| GET    | `/analytics/orders-by-warehouse`   | Orders by warehouse   |
| GET    | `/analytics/executive-dashboard`   | Executive KPIs        |

### Notifications

| Method | Endpoint                         | Description        |
| ------ | -------------------------------- | ------------------ |
| GET    | `/notifications/`                | List notifications |
| PATCH  | `/notifications/{id}/read`       | Mark as read       |
| POST   | `/notifications/register-device` | Register FCM token |

### Warehouses

| Method | Endpoint       | Description         |
| ------ | -------------- | ------------------- |
| GET    | `/warehouses/` | List all warehouses |

### Sync (Offline)

| Method | Endpoint                   | Description                 |
| ------ | -------------------------- | --------------------------- |
| POST   | `/sync/status-updates`     | Sync offline status updates |
| POST   | `/sync/proof-of-delivery`  | Sync offline POD            |
| GET    | `/sync/orders/{driver_id}` | Resync driver orders        |

---

## Common Query Parameters

### Pagination

```
?skip=0&limit=50
```

### Filtering Orders

```
?status=pending&warehouse_id=1&driver_id=5&start_date=2026-01-01&end_date=2026-01-31
```

### Filtering Drivers

```
?is_available=true&warehouse_id=1
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message description"
}
```

| Status | Description                          |
| ------ | ------------------------------------ |
| 400    | Bad Request - Invalid input          |
| 401    | Unauthorized - Invalid/missing token |
| 403    | Forbidden - Insufficient permissions |
| 404    | Not Found - Resource doesn't exist   |
| 422    | Validation Error - Schema mismatch   |
| 500    | Internal Server Error                |

---

## Rate Limiting

- Default: 1000 requests per minute per IP
- Location updates: 6 per minute per driver

---

## WebSocket Connections

### Driver Location Updates

```javascript
const ws = new WebSocket(
  "wss://api.pharmafleet.com/api/v1/drivers/ws/location-updates",
);

ws.onmessage = (event) => {
  const location = JSON.parse(event.data);
  console.log(
    `Driver ${location.driver_id} at ${location.lat}, ${location.lng}`,
  );
};
```

---

## Data Types

### Order Status Values

`pending` | `assigned` | `received` | `picked_up` | `in_transit` | `delivered` | `rejected` | `cancelled` | `returned`

### Driver Status Values

`online` | `offline` | `busy`

### Payment Methods

`prepaid` | `cod` | `knet` | `myfatoora`

### User Roles

`super_admin` | `warehouse_manager` | `dispatcher` | `executive` | `driver`
