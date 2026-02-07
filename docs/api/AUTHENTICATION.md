# PharmaFleet Authentication Guide

This document describes the authentication flow for the PharmaFleet API.

## Overview

PharmaFleet uses JWT (JSON Web Token) based authentication with access and refresh tokens.

| Token Type | Expiration | Purpose |
|------------|------------|---------|
| Access Token | 60 minutes | API request authentication |
| Refresh Token | 7 days | Obtain new access tokens |

## Login Flow

### 1. Obtain Access Token

**Endpoint:** `POST /login/access-token`

**Content-Type:** `application/x-www-form-urlencoded`

**Request Body:**
```
username=admin@pharmafleet.com&password=your_password
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Example (cURL):**
```bash
curl -X POST "https://pharmafleet-olive.vercel.app/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@pharmafleet.com&password=yourpassword"
```

**Example (JavaScript):**
```javascript
const response = await fetch('https://pharmafleet-olive.vercel.app/api/v1/login/access-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    username: 'admin@pharmafleet.com',
    password: 'yourpassword'
  })
});

const { access_token, refresh_token } = await response.json();
```

### 2. Use Access Token

Include the access token in the `Authorization` header for all authenticated requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example (cURL):**
```bash
curl -X GET "https://pharmafleet-olive.vercel.app/api/v1/users/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Token Refresh

When the access token expires, use the refresh token to obtain a new one without re-authenticating.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "new_access_token_here",
  "refresh_token": "same_refresh_token",
  "token_type": "bearer"
}
```

**Example (JavaScript):**
```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://pharmafleet-olive.vercel.app/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  return await response.json();
}
```

## Logout

Logout invalidates the current access token by adding it to a blacklist.

**Endpoint:** `POST /auth/logout`

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "msg": "Successfully logged out"
}
```

## Mobile App Authentication

### FCM Token Registration

After login, mobile apps should register their Firebase Cloud Messaging (FCM) token to receive push notifications.

**Endpoint:** `POST /auth/fcm-token`

**Request Body:**
```json
{
  "token": "fcm_device_token_here"
}
```

**Response:**
```json
{
  "msg": "FCM token registered successfully"
}
```

For drivers, this also subscribes them to their warehouse's notification topic for broadcast messages.

### Token Refresh in Mobile Apps

The mobile app implements automatic token refresh:

1. On receiving a 401 response, attempt token refresh
2. Use a separate HTTP client instance for refresh to avoid interceptor loops
3. Use a flag (`_isRefreshing`) to prevent concurrent refresh attempts
4. On successful refresh, retry the original request
5. On refresh failure, redirect to login screen

**Flutter Example:**
```dart
class DioClient {
  bool _isRefreshing = false;

  Future<Response> _handleError(DioException error) async {
    if (error.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshToken = await storage.read('refresh_token');
        final newTokens = await authService.refresh(refreshToken);
        await storage.write('access_token', newTokens.accessToken);

        // Retry original request
        return await retryRequest(error.requestOptions);
      } catch (e) {
        await logout();
        rethrow;
      } finally {
        _isRefreshing = false;
      }
    }
    rethrow;
  }
}
```

## Rate Limits

The following rate limits are enforced to prevent abuse:

| Endpoint | Rate Limit | Description |
|----------|------------|-------------|
| `POST /login/access-token` | 5/minute | Login attempts per IP |
| `POST /orders/import` | 10/5 minutes | Excel file imports |
| `POST /orders/export` | 5/minute | Order exports |

### Rate Limit Response

When rate limited, the API returns:

```http
HTTP/1.1 429 Too Many Requests
```

```json
{
  "detail": "Too many login attempts. Please try again later."
}
```

### Handling Rate Limits

1. Implement exponential backoff when receiving 429 responses
2. Cache frequently accessed data to reduce API calls
3. Use batch endpoints where available

## Error Responses

### 400 Bad Request - Invalid Credentials
```json
{
  "detail": "Incorrect email or password"
}
```

### 400 Bad Request - Inactive User
```json
{
  "detail": "Inactive user"
}
```

### 400 Bad Request - Invalid Token
```json
{
  "detail": "Invalid token type"
}
```

### 401 Unauthorized - Token Expired/Invalid
```json
{
  "detail": "Could not validate credentials"
}
```

### 401 Unauthorized - Token Blacklisted
```json
{
  "detail": "Token has been invalidated"
}
```

### 403 Forbidden - Insufficient Permissions
```json
{
  "detail": "The user doesn't have enough privileges"
}
```

### 429 Too Many Requests - Rate Limited
```json
{
  "detail": "Too many login attempts. Please try again later."
}
```

## Security Best Practices

### Token Storage

| Platform | Recommended Storage |
|----------|---------------------|
| Web | HttpOnly cookies or memory (not localStorage) |
| Mobile | Secure storage (Keychain/Keystore) |

### Token Security

1. **Never log token content** - Log length only: `Token attached (${token.length} chars)`
2. **Use HTTPS only** - All API calls must use HTTPS in production
3. **Clear tokens on logout** - Remove from storage and call logout endpoint
4. **Handle expiration gracefully** - Implement automatic refresh

### JWT Payload Structure

The access token contains:
```json
{
  "sub": "user_id",
  "type": "access",
  "exp": 1699999999,
  "iat": 1699996399
}
```

The refresh token contains:
```json
{
  "sub": "user_id",
  "type": "refresh",
  "exp": 1700599999,
  "iat": 1699996399
}
```

## User Roles and Permissions

| Role | Can Create Users | Can Manage Drivers | Can Assign Orders | Can View Analytics |
|------|-----------------|-------------------|-------------------|-------------------|
| `super_admin` | Yes | Yes | Yes | Yes |
| `warehouse_manager` | No | Yes | Yes | Yes |
| `dispatcher` | No | Status only | Yes | Limited |
| `executive` | No | No | No | Yes |
| `driver` | No | Own status | No | Own stats |

## API Dependencies

The following FastAPI dependencies handle authentication:

| Dependency | Usage |
|------------|-------|
| `get_current_user` | Validates JWT, returns User |
| `get_current_active_user` | Requires active user |
| `get_current_active_superuser` | Requires is_superuser=True |
| `get_current_admin_user` | Requires super_admin role |
| `get_current_manager_or_above` | Requires manager or admin |
| `get_current_dispatcher_or_above` | Requires dispatcher, manager, or admin |
