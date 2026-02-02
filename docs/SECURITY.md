# PharmaFleet Security Architecture

## Overview

This document outlines the security architecture, vulnerabilities addressed, and best practices for the PharmaFleet delivery management system.

**Last Updated**: 2026-02-02
**Security Contact**: security@pharmafleet.com

---

## Table of Contents

1. [Security Improvements Implemented](#security-improvements-implemented)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Mobile App Security](#mobile-app-security)
7. [Vulnerability Disclosure](#vulnerability-disclosure)
8. [Security Testing](#security-testing)

---

## Security Improvements Implemented

### Phase 1: Critical Security Fixes (Completed 2026-02-02)

#### 1. Password Reset Function Fixed
- **Issue**: Missing `verify_token_subject()` function caused password reset to fail completely
- **Fix**: Implemented JWT token verification with subject validation
- **File**: `backend/app/core/security.py`
- **Impact**: Password reset feature now functional and secure

#### 2. SECRET_KEY Validation Enforced
- **Issue**: Default "CHANGEME" secret key allowed authentication bypass
- **Fix**: Added Pydantic validator rejecting weak/default keys
- **File**: `backend/app/core/config.py`
- **Requirements**:
  - SECRET_KEY must not be "CHANGEME"
  - Must be at least 32 characters long
  - Generate with: `python -c 'import secrets; print(secrets.token_urlsafe(32))'`
- **Impact**: Prevents token forgery and authentication bypass

#### 3. JWT Token Expiration Reduced
- **Issue**: Tokens valid for 8 days provided too large compromise window
- **Fix**: Reduced to 2 hours (120 minutes)
- **File**: `backend/app/core/config.py`
- **Impact**: 96% reduction in token compromise window

#### 4. WebSocket Authentication Required
- **Issue**: WebSocket connections accepted without authentication
- **Fix**: Reject connections without valid JWT token
- **Files**: `backend/app/routers/websocket.py`
- **Behavior**:
  - Token REQUIRED in query parameter: `/ws/drivers?token=<jwt>`
  - Invalid/missing tokens result in connection rejection (1008 Policy Violation)
  - Only authenticated users can receive driver location updates
- **Impact**: Protected real-time location data from unauthorized access

#### 5. Warehouse Access Control
- **Issue**: Users could access orders from any warehouse
- **Fix**: Implemented warehouse-level data isolation
- **Files**:
  - `backend/app/api/deps.py` (helper function)
  - `backend/app/api/v1/endpoints/orders.py` (enforcement)
- **Behavior**:
  - Super admins: Access all warehouses
  - Drivers: Access only assigned warehouse orders
  - Warehouse managers: Access assigned warehouse (to be refined)
  - Attempts to access unauthorized warehouses return 403 Forbidden
- **Impact**: Enforces data isolation and prevents data leaks

---

## Authentication & Authorization

### JWT Token Management

**Token Types**:
- **Access Token**: 2-hour expiration, used for API requests
- **Refresh Token**: 30-day expiration, used to obtain new access tokens

**Token Structure**:
```json
{
  "sub": "user_id",
  "exp": 1234567890,
  "type": "access" | "refresh"
}
```

**Token Storage**:
- **Mobile**: Secure storage via `flutter_secure_storage`
- **Web**: HTTP-only cookies (recommended) or localStorage with XSS protection

**Token Validation**:
- Signature verification using HS256 algorithm
- Expiration timestamp validation
- Subject (user ID) presence validation
- Blacklist check for revoked tokens

### Role-Based Access Control (RBAC)

**Roles**:
1. **super_admin**: Full system access
2. **warehouse_manager**: Manage assigned warehouse operations
3. **dispatcher**: Assign orders to drivers
4. **executive**: View analytics and reports
5. **driver**: View and update assigned orders

**Permission Matrix**:

| Resource | super_admin | warehouse_manager | dispatcher | executive | driver |
|----------|-------------|-------------------|------------|-----------|--------|
| All warehouses | ✓ | ✗ | ✗ | ✓ | ✗ |
| Assigned warehouse | ✓ | ✓ | ✓ | ✓ | ✓ |
| Assign orders | ✓ | ✓ | ✓ | ✗ | ✗ |
| View analytics | ✓ | ✓ | ✓ | ✓ | ✗ |
| Update order status | ✓ | ✓ | ✓ | ✗ | ✓ |
| Upload POD | ✓ | ✗ | ✗ | ✗ | ✓ |
| Manage users | ✓ | ✗ | ✗ | ✗ | ✗ |

### Password Security

- **Hashing**: bcrypt with automatic salt generation
- **Minimum Requirements**:
  - 8 characters minimum
  - Mix of uppercase, lowercase, numbers (recommended)
- **Reset Process**:
  1. User requests reset via email
  2. Time-limited token sent to email (valid 1 hour)
  3. Token validates user identity via `verify_token_subject()`
  4. New password hashed with bcrypt before storage

---

## Data Protection

### Data Encryption

**In Transit**:
- All API communication over HTTPS/TLS 1.2+
- WebSocket connections over WSS (TLS)
- Certificate management via Vercel/Let's Encrypt

**At Rest**:
- Database: PostgreSQL with encrypted connections
- File Storage: Supabase Storage with encryption
- Secrets: Environment variables, never committed to Git

### Sensitive Data Handling

**Personal Information**:
- Customer names, phone numbers, addresses stored in JSONB
- Driver personal information in separate `drivers` table
- No credit card information stored (payment processing via third-party)

**Location Data**:
- Driver locations stored with timestamps
- Retention: 7 days of granular data, then aggregated
- Access restricted to authenticated users only (after fix)

### Data Retention

| Data Type | Retention Period | Archive After |
|-----------|------------------|---------------|
| Orders | Indefinite | 7 days (delivered) |
| Driver Locations | 7 days | Not archived |
| Audit Logs | 90 days | 30 days |
| User Sessions | Until logout | N/A |

---

## API Security

### Rate Limiting

**Current Implementation**: `slowapi` with Redis backend

**Limits** (per IP address):
- **Login Endpoint**: 5 requests / minute
- **Password Reset**: 3 requests / 5 minutes
- **Order Creation**: 100 requests / minute
- **General API**: 1000 requests / minute

**Behavior on Limit Exceeded**:
- HTTP 429 Too Many Requests
- Retry-After header provided
- Logged for monitoring

### Input Validation

**Request Validation**:
- Pydantic schemas validate all request bodies
- Type checking enforced (int, str, float, etc.)
- Regex validation for phone numbers, emails
- Length limits on string fields

**SQL Injection Prevention**:
- SQLAlchemy ORM with parameterized queries
- No raw SQL execution with user input
- LIKE queries use parameterized wildcards

**XSS Prevention**:
- API returns JSON (Content-Type: application/json)
- Frontend sanitizes HTML before rendering
- No user-generated HTML accepted

### CORS Configuration

**Allowed Origins** (configured in `backend/app/core/config.py`):
- `http://localhost:3000` (development)
- `https://dashboard.pharmafleet.com` (production)
- `https://staging.dashboard.pharmafleet.com` (staging)

**Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS

**Credentials**: Allowed (for cookie-based auth)

---

## Infrastructure Security

### Database Security

**PostgreSQL Configuration**:
- Connection pooling with max 20 connections
- SSL required for all connections
- Statement caching enabled (128 statements)
- Prepared statements prevent SQL injection

**Access Control**:
- Database user with minimum required privileges
- No public internet access (internal network only)
- Regular backups encrypted at rest

### Secrets Management

**Environment Variables**:
```bash
# Required secrets
SECRET_KEY=<64-char-random-string>
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=<supabase-key>
REDIS_URL=redis://...
FIREBASE_SERVICE_ACCOUNT_JSON=<json-string>
```

**Storage**:
- Development: `.env` file (gitignored)
- Production: Vercel environment variables
- Never commit secrets to version control

### Vercel Deployment

**Security Features**:
- Automatic HTTPS with certificates
- Environment variable encryption
- Serverless function isolation
- DDoS protection at edge

**Configuration** (`vercel.json`):
- Frontend: Static build served from CDN
- Backend: Serverless functions with Mangum wrapper
- API routes: `/api/*` proxied to backend

---

## Mobile App Security

### Flutter App Security

**Local Storage**:
- JWT tokens: `flutter_secure_storage` (iOS Keychain / Android Keystore)
- Offline data: Hive encrypted boxes
- Sensitive data never stored in SharedPreferences

**Network Security**:
- Certificate pinning (recommended for production)
- HTTPS-only communication
- Token refresh handled automatically

**Biometric Authentication** (planned):
- Optional fingerprint/Face ID for app unlock
- Fallback to PIN code
- Tokens remain in secure storage

**Location Tracking**:
- Background location permissions clearly explained
- User can toggle online/offline mode
- Location data encrypted before transmission

---

## Vulnerability Disclosure

### Reporting Security Issues

**Contact**: security@pharmafleet.com

**Please Include**:
1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if available)

**Response Time**:
- Acknowledgment: Within 24 hours
- Initial assessment: Within 3 business days
- Fix timeline: Based on severity (critical: 7 days, high: 14 days)

### Bug Bounty

Currently, PharmaFleet does not have a formal bug bounty program. However, we appreciate responsible disclosure and acknowledge security researchers in our security hall of fame.

---

## Security Testing

### Automated Testing

**Test Coverage**:
- Unit tests: Authentication functions
- Integration tests: API endpoints with security requirements
- Security tests: See `backend/tests/security/`

**Run Tests**:
```bash
cd backend
pytest tests/security/ -v
pytest tests/ --cov=app --cov-report=term-missing
```

### Manual Security Testing

**Regular Audits**:
- [ ] Quarterly dependency vulnerability scans (`safety check`)
- [ ] Quarterly penetration testing
- [ ] Annual third-party security audit

**Pre-Deployment Checklist**:
- [ ] All tests passing
- [ ] No hardcoded secrets in code
- [ ] SECRET_KEY properly configured
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Database migrations applied
- [ ] Backup verified

---

## Security Incident Response

### Incident Classification

**Severity Levels**:
1. **Critical**: Data breach, authentication bypass, RCE
2. **High**: Privilege escalation, XSS, CSRF
3. **Medium**: Information disclosure, rate limit bypass
4. **Low**: Missing security headers, weak validation

### Response Procedure

1. **Detection**: Monitoring, user reports, automated alerts
2. **Containment**: Isolate affected systems, revoke compromised tokens
3. **Investigation**: Root cause analysis, impact assessment
4. **Eradication**: Apply patches, update dependencies
5. **Recovery**: Restore services, verify fixes
6. **Post-Incident**: Document lessons learned, update procedures

---

## Compliance

### Data Protection

- **GDPR** (if applicable): User data rights, deletion requests
- **Kuwait Data Protection Law**: Compliance with local regulations
- **HIPAA** (if applicable): PHI handling for pharmacy data

### Audit Logs

**Logged Events**:
- User authentication (login, logout, password reset)
- Order assignment and status changes
- Warehouse data access
- Administrative actions (user creation, role changes)

**Log Format** (JSON):
```json
{
  "timestamp": "2026-02-02T12:34:56Z",
  "event": "order_assigned",
  "user_id": 123,
  "role": "dispatcher",
  "resource": "order:456",
  "action": "assign",
  "metadata": { "driver_id": 789 }
}
```

---

## Security Roadmap

### Planned Improvements

**Q1 2026**:
- [ ] Multi-factor authentication (2FA)
- [ ] API key management for third-party integrations
- [ ] Enhanced audit logging with correlation IDs
- [ ] Certificate pinning in mobile app

**Q2 2026**:
- [ ] OAuth2 integration for SSO
- [ ] Web Application Firewall (WAF)
- [ ] Intrusion detection system (IDS)
- [ ] Automated security scanning in CI/CD

**Q3 2026**:
- [ ] Penetration testing by external firm
- [ ] SOC 2 Type II certification (if required)
- [ ] Bug bounty program launch
- [ ] Security awareness training for team

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)
- [Flutter Security Best Practices](https://flutter.dev/docs/deployment/security)

---

**Document Version**: 1.0.0
**Last Review**: 2026-02-02
**Next Review**: 2026-05-02
