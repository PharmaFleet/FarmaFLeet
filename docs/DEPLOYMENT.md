# PharmaFleet Deployment Guide

## Overview

This document provides comprehensive deployment instructions for the PharmaFleet delivery management system across all environments.

**Last Updated**: 2026-02-02

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Mobile App Deployment](#mobile-app-deployment)
6. [Database Migrations](#database-migrations)
7. [Monitoring & Logging](#monitoring--logging)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Accounts & Services

- **Vercel Account**: For frontend and backend hosting
- **PostgreSQL Database**: Managed instance (e.g., Neon, Supabase, AWS RDS)
- **Redis Instance**: For caching and rate limiting
- **Supabase Account**: For file storage (POD images)
- **Firebase Project**: For push notifications (mobile)
- **Google Cloud Console**: For Maps API (frontend and mobile)

### Required Tools

- Git
- Node.js 18+ & npm
- Python 3.11+
- Flutter 3.10+
- Docker (optional, for local testing)
- Vercel CLI (`npm install -g vercel`)

---

## Environment Configuration

### Backend Environment Variables

Create `.env` file in `backend/` directory:

```bash
# Application Settings
PROJECT_NAME=PharmaFleet
API_V1_STR=/api/v1

# Security (CRITICAL - Generate secure values)
# Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'
SECRET_KEY=<YOUR-64-CHAR-RANDOM-STRING>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120  # 2 hours
REFRESH_TOKEN_EXPIRE_DAYS=30

# Database (Required)
DATABASE_URL=postgresql://user:password@host:5432/pharmafleet
# Or use individual components:
POSTGRES_SERVER=host
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=pharmafleet
POSTGRES_PORT=5432

# Redis (Required for rate limiting)
REDIS_URL=redis://redis-host:6379/0

# Supabase Storage (Required for POD images)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_BUCKET=pharmafleet-uploads

# CORS Origins (Update for production)
BACKEND_CORS_ORIGINS=https://dashboard.pharmafleet.com,https://staging.pharmafleet.com

# Firebase Admin (For push notifications)
FIREBASE_SERVICE_ACCOUNT_JSON='<firebase-service-account-json>'
```

### Frontend Environment Variables

Create `.env` file in `frontend/` directory:

```bash
VITE_API_URL=https://api.pharmafleet.com/api/v1
VITE_GOOGLE_MAPS_API_KEY=<google-maps-api-key>
```

### Mobile Environment Variables

Configure in `mobile/driver_app/android/local.properties`:

```properties
sdk.dir=/path/to/Android/sdk
```

Add Firebase config:
- Place `google-services.json` in `mobile/driver_app/android/app/`
- Update `AndroidManifest.xml` with Google Maps API key

---

## Backend Deployment

### Vercel Deployment (Recommended)

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login to Vercel

```bash
vercel login
```

#### 3. Deploy Backend

```bash
cd backend
vercel --prod
```

#### 4. Configure Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables from `backend/.env`
3. **CRITICAL**: Ensure `SECRET_KEY` is set to a secure random value

**Required Variables**:
- `SECRET_KEY` (64+ characters)
- `DATABASE_URL`
- `REDIS_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

#### 5. Run Database Migrations

```bash
# Connect to production database
DATABASE_URL=<production-db-url> alembic upgrade head
```

**Alternative**: Automated migrations in CI/CD (see below)

### Docker Deployment (Alternative)

```bash
cd backend
docker build -t pharmafleet-backend .
docker run -p 8000:8000 --env-file .env pharmafleet-backend
```

---

## Frontend Deployment

### Vercel Deployment

#### 1. Build Frontend

```bash
cd frontend
npm install
npm run build
```

#### 2. Deploy to Vercel

```bash
vercel --prod
```

#### 3. Configure Environment Variables

In Vercel Dashboard:
1. Add `VITE_API_URL` pointing to backend URL
2. Add `VITE_GOOGLE_MAPS_API_KEY`

#### 4. Verify Deployment

Navigate to your Vercel URL and verify:
- [ ] Login page loads
- [ ] API connection works
- [ ] Google Maps loads correctly

### Static Hosting (Alternative)

```bash
npm run build
# Upload dist/ folder to any static host
# Configure to serve index.html for all routes
```

---

## Mobile App Deployment

### Android APK Build

#### 1. Configure Firebase

```bash
cd mobile/driver_app
# Ensure google-services.json is in android/app/
```

#### 2. Build Release APK

```bash
flutter clean
flutter pub get
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

#### 3. Test Release Build

```bash
flutter install --release
```

### Google Play Store Deployment

#### 1. Build App Bundle

```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

#### 2. Sign with Keystore

```bash
# Generate keystore (first time only)
keytool -genkey -v -keystore pharmafleet-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias pharmafleet

# Configure signing in android/app/build.gradle
```

#### 3. Upload to Play Console

1. Go to Google Play Console
2. Create new release
3. Upload app bundle
4. Fill out release notes
5. Submit for review

---

## Database Migrations

### Manual Migration

```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Review generated migration in alembic/versions/

# Apply migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

### Automated Migrations in CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run database migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd backend
          alembic upgrade head

      - name: Deploy to Vercel
        run: |
          npm install -g vercel
          vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

### Migration Best Practices

**Before Migration**:
- [ ] Backup database
- [ ] Test migration on staging
- [ ] Review generated SQL
- [ ] Plan rollback strategy

**After Migration**:
- [ ] Verify data integrity
- [ ] Check application functionality
- [ ] Monitor for errors
- [ ] Keep backup for 7 days

---

## Monitoring & Logging

### Application Monitoring

**Vercel Analytics** (built-in):
- Request counts
- Error rates
- Response times
- Geographic distribution

**Custom Logging** (backend):
```python
from app.core.logging import logger

logger.info("Order created", extra={"order_id": order.id})
logger.error("Payment failed", extra={"error": str(e)})
```

**Log Aggregation**:
- Vercel logs: `vercel logs`
- Production: Use external service (e.g., Datadog, LogRocket)

### Health Checks

**Backend Health Endpoint**:
```bash
curl https://api.pharmafleet.com/health
# Expected: {"status": "healthy", "version": "1.0.0"}
```

**Database Health**:
```bash
curl https://api.pharmafleet.com/health/db
# Expected: {"database": "connected", "latency_ms": 15}
```

### Performance Monitoring

**Key Metrics**:
- API response time (P50, P95, P99)
- Database query performance
- WebSocket connection count
- Mobile app crash rate

**Alerts**:
- Error rate > 1%
- Response time P95 > 1000ms
- Database connections > 80% of pool
- Redis memory > 90%

---

## Rollback Procedures

### Backend Rollback

#### Vercel Deployment Rollback

```bash
# List deployments
vercel list

# Rollback to previous deployment
vercel rollback <deployment-url>
```

#### Database Migration Rollback

```bash
# Check current version
alembic current

# Rollback one version
alembic downgrade -1

# Rollback to specific version
alembic downgrade <revision_id>
```

### Frontend Rollback

```bash
# Vercel automatically keeps previous deployments
vercel rollback <deployment-url>
```

### Mobile App Rollback

1. Go to Google Play Console
2. Navigate to "Production" track
3. Create new release with previous APK/AAB
4. Submit for review (expedited if critical)

**Note**: Mobile rollbacks take 2-4 hours for review

---

## Troubleshooting

### Common Issues

#### Issue: SECRET_KEY validation error on startup

**Error**: `ValueError: SECRET_KEY must be set to a secure random value`

**Solution**:
```bash
# Generate secure key
python -c 'import secrets; print(secrets.token_urlsafe(32))'

# Set in environment variables
export SECRET_KEY=<generated-key>
```

#### Issue: Database connection failed

**Error**: `sqlalchemy.exc.OperationalError: could not connect to server`

**Solutions**:
1. Verify DATABASE_URL is correct
2. Check database server is running
3. Verify firewall allows connections
4. Test connection: `psql $DATABASE_URL`

#### Issue: Vercel deployment failed

**Solutions**:
1. Check `vercel logs` for errors
2. Verify all environment variables are set
3. Ensure Python version matches (3.11)
4. Check `requirements.txt` dependencies

#### Issue: WebSocket connection rejected

**Error**: Connection closed with code 1008

**Solution**:
1. Verify JWT token is valid
2. Ensure token is passed in query parameter: `?token=<jwt>`
3. Check token expiration (2 hours)

---

## Security Checklist

**Pre-Deployment**:
- [ ] SECRET_KEY is strong (64+ characters, random)
- [ ] Database uses SSL/TLS connections
- [ ] Redis requires authentication
- [ ] CORS origins limited to production domains
- [ ] Rate limiting enabled
- [ ] File upload size limits configured
- [ ] Environment variables never committed to Git

**Post-Deployment**:
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Monitoring alerts active
- [ ] Backup verified
- [ ] Access logs enabled
- [ ] Error tracking configured

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor error rates
- Check application logs
- Verify backup completion

**Weekly**:
- Review slow queries
- Check disk space
- Analyze user feedback

**Monthly**:
- Update dependencies (`pip list --outdated`, `npm outdated`)
- Review security advisories
- Test backup restoration
- Clean up old data (auto-archive)

### Dependency Updates

```bash
# Backend
cd backend
pip install --upgrade -r requirements.txt
pytest  # Verify tests pass

# Frontend
cd frontend
npm update
npm run test
npm run build

# Mobile
cd mobile/driver_app
flutter pub upgrade
flutter test
```

---

## Support

### Documentation

- [CLAUDE.md](../CLAUDE.md): Project overview and development
- [SECURITY.md](SECURITY.md): Security architecture
- [IMPROVEMENTS_APPLIED.md](../IMPROVEMENTS_APPLIED.md): Recent improvements

### Contact

- **Technical Support**: support@pharmafleet.com
- **Security Issues**: security@pharmafleet.com
- **GitHub Issues**: https://github.com/pharmafleet/delivery-system/issues

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-02
