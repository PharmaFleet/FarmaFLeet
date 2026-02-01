# PharmaFleet DevOps Migration - Complete Step-by-Step Guide

> **Document Version**: 1.0  
> **Created**: 2026-01-29  
> **Status**: Ready for Execution  
> **Priority**: Critical - Emergency Migration

---

## Executive Summary

This comprehensive guide provides step-by-step instructions for migrating the PharmaFleet delivery system to a new Google Cloud Platform account following account suspension. The guide prioritizes **cost optimization** while maintaining production reliability.

### Key Decisions Made

| Decision        | Choice                 | Rationale                                                |
| --------------- | ---------------------- | -------------------------------------------------------- |
| Cloud Provider  | New GCP Account        | Familiarity, existing workflows, minimal code changes    |
| Cost Strategy   | Budget-Optimized       | Leverage free tiers, smaller instances, scale-to-zero    |
| Data Migration  | Local Backup Available | No data loss risk                                        |
| Firebase Status | Create New Account     | Safety measure, current has security warning             |
| CVE-2025-55182  | **Not Affected**       | PharmaFleet uses React 18.3.1 (issue affects React 19.x) |

### Estimated Monthly Costs (Optimized)

| Service             | Old Config | Optimized Config | Monthly Savings |
| ------------------- | ---------- | ---------------- | --------------- |
| Cloud Run (Backend) | $80        | $20-40           | ~$40-60         |
| Cloud SQL           | $100       | $10-30           | ~$70-90         |
| Redis/Cache         | $50        | $0-5             | ~$45-50         |
| Cloud Storage + CDN | $40        | $15-20           | ~$20-25         |
| **Total**           | **~$270**  | **~$50-100**     | **~$170-220**   |

---

## Table of Contents

1. [Pre-Migration Checklist](#1-pre-migration-checklist)
2. [Phase 1: GCP Account & Project Setup](#phase-1-gcp-account--project-setup-day-1)
3. [Phase 2: Infrastructure Provisioning](#phase-2-infrastructure-provisioning-day-1-2)
4. [Phase 3: Database Setup & Migration](#phase-3-database-setup--migration-day-2)
5. [Phase 4: Backend Deployment](#phase-4-backend-deployment-day-2)
6. [Phase 5: Frontend Deployment](#phase-5-frontend-deployment-day-2-3)
7. [Phase 6: Firebase & Mobile Setup](#phase-6-firebase--mobile-setup-day-3)
8. [Phase 7: CI/CD Pipeline Configuration](#phase-7-cicd-pipeline-configuration-day-3)
9. [Phase 8: DNS & SSL Configuration](#phase-8-dns--ssl-configuration-day-3-4)
10. [Phase 9: Testing & Verification](#phase-9-testing--verification-day-4)
11. [Post-Migration Tasks](#post-migration-tasks)
12. [Rollback Procedures](#rollback-procedures)
13. [Cost Monitoring & Optimization](#cost-monitoring--optimization)

---

## 1. Pre-Migration Checklist

### Required Before Starting

- [ ] **New email account** for GCP (not linked to suspended account)
- [ ] **Payment method** (credit card or bank account)
- [ ] **Domain access** (DNS management for pharmafleet.com)
- [ ] **Local database backup** confirmed available
- [ ] **Android keystore file** (for app signing) - backup or regenerate
- [ ] **Team availability** for 3-4 day migration window

### Required Credentials to Generate

| Credential             | Purpose             | Phase |
| ---------------------- | ------------------- | ----- |
| GCP Project ID         | All services        | 1     |
| Service Account JSON   | GitHub Actions      | 1     |
| Workload Identity Pool | OIDC Auth           | 1     |
| Database Password      | Cloud SQL           | 3     |
| Secret Key             | JWT Auth            | 3     |
| Google Maps API Key    | Maps                | 1     |
| Slack Webhook URL      | Notifications       | 7     |
| Android Keystore       | APK Signing         | 6     |
| Firebase Project       | Mobile Distribution | 6     |

---

## Phase 1: GCP Account & Project Setup (Day 1)

### Step 1.1: Create New Google Account

```
1. Go to https://accounts.google.com/signup
2. Create new account: pharmafleet.devops@gmail.com (or similar)
3. Complete verification (phone number required)
4. Enable 2-factor authentication
```

### Step 1.2: Create GCP Project

```bash
# Open https://console.cloud.google.com
# Click "Select a project" → "New Project"

# Project Details:
Project name: pharmafleet-prod
Project ID: pharmafleet-prod-XXXXX (auto-generated)
Organization: No organization
Location: No organization

# Click "Create"
```

### Step 1.3: Set Up Billing

```
1. Go to Billing → Manage billing accounts
2. Click "Create Account"
3. Enter payment information
4. Link to pharmafleet-prod project

💡 TIP: New accounts get $300 free credits for 90 days!
```

### Step 1.4: Enable Required APIs

```bash
# Open Cloud Shell or run locally with gcloud CLI installed

# Set project
gcloud config set project pharmafleet-prod-XXXXX

# Enable all required APIs (one command)
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  compute.googleapis.com \
  dns.googleapis.com \
  cloudbuild.googleapis.com

# Verify enabled APIs
gcloud services list --enabled
```

### Step 1.5: Create Artifact Registry Repository

```bash
# Create Docker repository for container images
gcloud artifacts repositories create pharmafleet-repo \
  --repository-format=docker \
  --location=me-central1 \
  --description="PharmaFleet Docker images"

# Verify creation
gcloud artifacts repositories list --location=me-central1
```

### Step 1.6: Generate Google Maps API Key

```
1. Go to APIs & Services → Credentials
2. Click "+ Create Credentials" → "API Key"
3. Click "Edit API Key"
4. Name: PharmaFleet Maps Key
5. Set restrictions:
   - Application restrictions: None (or HTTP referrers for production)
   - API restrictions:
     - Maps JavaScript API
     - Directions API
     - Geocoding API
     - Places API
6. Copy and save the API key securely
```

---

## Phase 2: Infrastructure Provisioning (Day 1-2)

### Step 2.1: Create Cloud Storage Buckets

```bash
# Frontend hosting bucket (production)
gsutil mb -p pharmafleet-prod-XXXXX -l me-central1 gs://pharmafleet-dashboard

# Frontend hosting bucket (staging)
gsutil mb -p pharmafleet-prod-XXXXX -l me-central1 gs://pharmafleet-dashboard-staging

# Make buckets public for web hosting
gsutil iam ch allUsers:objectViewer gs://pharmafleet-dashboard
gsutil iam ch allUsers:objectViewer gs://pharmafleet-dashboard-staging

# Set website configuration
gsutil web set -m index.html -e index.html gs://pharmafleet-dashboard
gsutil web set -m index.html -e index.html gs://pharmafleet-dashboard-staging
```

### Step 2.2: Create Secret Manager Secrets

```bash
# Generate a secure secret key
SECRET_KEY=$(openssl rand -hex 32)
echo "Generated SECRET_KEY: $SECRET_KEY"  # Save this!

# Create secrets (values will be added later)
echo -n "$SECRET_KEY" | gcloud secrets create pharmafleet-secret-key \
  --data-file=- \
  --replication-policy="automatic"

# Database URL (placeholder - update after DB creation)
echo -n "postgresql://user:password@host:5432/pharmafleet" | \
  gcloud secrets create pharmafleet-db-url \
  --data-file=- \
  --replication-policy="automatic"

# Staging database URL
echo -n "postgresql://user:password@host:5432/pharmafleet_staging" | \
  gcloud secrets create pharmafleet-db-url-staging \
  --data-file=- \
  --replication-policy="automatic"

# Google Maps API Key
echo -n "YOUR_MAPS_API_KEY" | gcloud secrets create pharmafleet-google-maps-key \
  --data-file=- \
  --replication-policy="automatic"

# Verify secrets created
gcloud secrets list
```

### Step 2.3: Set Up Workload Identity Federation (for GitHub Actions)

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe pharmafleet-prod-XXXXX --format='value(projectNumber)')
echo "Project Number: $PROJECT_NUMBER"

# Create Workload Identity Pool
gcloud iam workload-identity-pools create github-pool \
  --project=pharmafleet-prod-XXXXX \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create OIDC Provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=pharmafleet-prod-XXXXX \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Create Service Account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account" \
  --description="Service account for CI/CD deployments"

SA_EMAIL="github-actions@pharmafleet-prod-XXXXX.iam.gserviceaccount.com"

# Grant required roles
gcloud projects add-iam-policy-binding pharmafleet-prod-XXXXX \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding pharmafleet-prod-XXXXX \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding pharmafleet-prod-XXXXX \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding pharmafleet-prod-XXXXX \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding pharmafleet-prod-XXXXX \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"

# Allow GitHub to impersonate the service account
# Replace YOUR_GITHUB_ORG and YOUR_REPO with actual values
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --project=pharmafleet-prod-XXXXX \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_ORG/Delivery-System-III"

# Get the Workload Identity Provider resource name (needed for GitHub secrets)
echo "Workload Identity Provider:"
echo "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
```

---

## Phase 3: Database Setup & Migration (Day 2)

### Step 3.1: Create Cloud SQL Instance (Cost-Optimized)

```bash
# Create a SMALL instance to start (can upgrade later)
# Using db-f1-micro for ~$10/month

gcloud sql instances create pharmafleet-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=me-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04 \
  --availability-type=ZONAL \
  --no-assign-ip \
  --network=default

# ⚠️ NOTE: db-f1-micro has 0.6GB RAM - upgrade to db-g1-small ($25/mo) if needed

# Set root password (save this securely!)
DB_PASSWORD=$(openssl rand -base64 24)
gcloud sql users set-password postgres \
  --instance=pharmafleet-db \
  --password="$DB_PASSWORD"

echo "Database Password: $DB_PASSWORD"  # SAVE THIS!
```

### Step 3.2: Create Database and Enable PostGIS

```bash
# Create the database
gcloud sql databases create pharmafleet --instance=pharmafleet-db

# Connect to database to enable PostGIS
# Option A: Use Cloud SQL Studio in Console
# Option B: Use cloud_sql_proxy locally

# Install cloud_sql_proxy (Windows PowerShell)
# Download from https://cloud.google.com/sql/docs/postgres/sql-proxy

# Connect via proxy
.\cloud-sql-proxy.exe pharmafleet-prod-XXXXX:me-central1:pharmafleet-db

# In another terminal, connect with psql
psql -h 127.0.0.1 -U postgres -d pharmafleet

# Run in psql:
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
\dx  -- Verify extensions
\q
```

### Step 3.3: Import Local Database Backup

```bash
# Export from local PostgreSQL (run on your machine)
pg_dump -h localhost -p 5444 -U postgres -d pharmafleet \
  --no-owner --no-privileges \
  -f pharmafleet_backup.sql

# Upload backup to Cloud Storage
gsutil cp pharmafleet_backup.sql gs://pharmafleet-dashboard/backups/

# Import to Cloud SQL
gcloud sql import sql pharmafleet-db \
  gs://pharmafleet-dashboard/backups/pharmafleet_backup.sql \
  --database=pharmafleet \
  --user=postgres

# Verify data
# Connect via cloud_sql_proxy and run:
# SELECT COUNT(*) FROM users;
# SELECT COUNT(*) FROM orders;
```

### Step 3.4: Update Database URL Secret

```bash
# Get Cloud SQL connection name
CONNECTION_NAME=$(gcloud sql instances describe pharmafleet-db --format='value(connectionName)')
echo "Connection Name: $CONNECTION_NAME"

# For Cloud Run, use Unix socket connection:
DATABASE_URL="postgresql://postgres:$DB_PASSWORD@/pharmafleet?host=/cloudsql/$CONNECTION_NAME"

# Update the secret
echo -n "$DATABASE_URL" | gcloud secrets versions add pharmafleet-db-url --data-file=-

# Verify
gcloud secrets versions access latest --secret=pharmafleet-db-url
```

### Step 3.5: Alternative - Use Upstash Redis (Cost: FREE tier)

Instead of GCP Memorystore ($35+/month), use Upstash Redis:

```
1. Go to https://upstash.com
2. Sign up with GitHub
3. Create new Redis database:
   - Name: pharmafleet-cache
   - Region: Europe (or closest to me-central1)
   - Type: Regional
   - Eviction: Enabled (LRU)
4. Copy the Redis URL (format: redis://default:xxx@xxx.upstash.io:6379)
5. Add to Secret Manager:

gcloud secrets create pharmafleet-redis-url --replication-policy="automatic"
echo -n "YOUR_UPSTASH_REDIS_URL" | gcloud secrets versions add pharmafleet-redis-url --data-file=-
```

---

## Phase 4: Backend Deployment (Day 2)

### Step 4.1: Configure Docker Authentication

```bash
# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker me-central1-docker.pkg.dev
```

### Step 4.2: Build and Push Docker Image

```bash
# Navigate to backend directory
cd e:\Py\Delivery-System-III\backend

# Build the Docker image
docker build -t me-central1-docker.pkg.dev/pharmafleet-prod-XXXXX/pharmafleet-repo/pharmafleet-api:v1.0.0 .

# Also tag as latest
docker tag me-central1-docker.pkg.dev/pharmafleet-prod-XXXXX/pharmafleet-repo/pharmafleet-api:v1.0.0 \
  me-central1-docker.pkg.dev/pharmafleet-prod-XXXXX/pharmafleet-repo/pharmafleet-api:latest

# Push to Artifact Registry
docker push me-central1-docker.pkg.dev/pharmafleet-prod-XXXXX/pharmafleet-repo/pharmafleet-api:v1.0.0
docker push me-central1-docker.pkg.dev/pharmafleet-prod-XXXXX/pharmafleet-repo/pharmafleet-api:latest
```

### Step 4.3: Deploy to Cloud Run (Cost-Optimized)

```bash
# Get Cloud SQL connection name
CONNECTION_NAME=$(gcloud sql instances describe pharmafleet-db --format='value(connectionName)')

# Deploy with MINIMAL resources (scale to zero when idle)
gcloud run deploy pharmafleet-api \
  --image=me-central1-docker.pkg.dev/pharmafleet-prod-XXXXX/pharmafleet-repo/pharmafleet-api:latest \
  --region=me-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=300 \
  --cpu-boost \
  --set-cloudsql-instances=$CONNECTION_NAME \
  --set-secrets="DATABASE_URL=pharmafleet-db-url:latest,SECRET_KEY=pharmafleet-secret-key:latest,GOOGLE_MAPS_KEY=pharmafleet-google-maps-key:latest" \
  --set-env-vars="ENVIRONMENT=production,CORS_ORIGINS=https://dashboard.pharmafleet.com"

# Get the service URL
gcloud run services describe pharmafleet-api --region=me-central1 --format='value(status.url)'
```

### Step 4.4: Deploy Staging Environment

```bash
gcloud run deploy pharmafleet-api-staging \
  --image=me-central1-docker.pkg.dev/pharmafleet-prod-XXXXX/pharmafleet-repo/pharmafleet-api:latest \
  --region=me-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=80 \
  --cpu-boost \
  --set-cloudsql-instances=$CONNECTION_NAME \
  --set-secrets="DATABASE_URL=pharmafleet-db-url-staging:latest,SECRET_KEY=pharmafleet-secret-key:latest" \
  --set-env-vars="ENVIRONMENT=staging,DEBUG=true,CORS_ORIGINS=*"
```

### Step 4.5: Verify Backend Deployment

```bash
# Get the production URL
BACKEND_URL=$(gcloud run services describe pharmafleet-api --region=me-central1 --format='value(status.url)')

# Test health check
curl "$BACKEND_URL/api/v1/utils/health-check"

# Expected response: {"status":"healthy","database":"connected","timestamp":"..."}
```

---

## Phase 5: Frontend Deployment (Day 2-3)

### Step 5.1: Build Frontend for Production

```bash
# Navigate to frontend directory
cd e:\Py\Delivery-System-III\frontend

# Install dependencies
npm ci

# Build for production with correct API URL
# Replace with your actual Cloud Run URL
$env:VITE_API_URL = "https://pharmafleet-api-XXXXX-me.a.run.app/api/v1"
$env:VITE_GOOGLE_MAPS_KEY = "YOUR_GOOGLE_MAPS_API_KEY"

npm run build

# Verify build output
ls dist/
```

### Step 5.2: Upload to Cloud Storage

```bash
# Upload all files
gsutil -m rsync -r -d dist/ gs://pharmafleet-dashboard/

# Set cache headers for optimal performance
# Long cache for hashed assets (JS/CSS)
gsutil -m setmeta -h "Cache-Control:public,max-age=31536000,immutable" \
  "gs://pharmafleet-dashboard/assets/**"

# No cache for HTML (always get latest)
gsutil -m setmeta -h "Cache-Control:no-cache,no-store,must-revalidate" \
  "gs://pharmafleet-dashboard/index.html"

# Verify upload
gsutil ls gs://pharmafleet-dashboard/
```

### Step 5.3: Configure Cloud CDN (Optional but Recommended)

```bash
# Create backend bucket
gcloud compute backend-buckets create pharmafleet-frontend-bucket \
  --gcs-bucket-name=pharmafleet-dashboard \
  --enable-cdn

# Create URL map
gcloud compute url-maps create pharmafleet-frontend-lb \
  --default-backend-bucket=pharmafleet-frontend-bucket

# Create HTTP(S) proxy
gcloud compute target-http-proxies create pharmafleet-frontend-proxy \
  --url-map=pharmafleet-frontend-lb

# Reserve static IP
gcloud compute addresses create pharmafleet-frontend-ip --global

# Get the IP address
gcloud compute addresses describe pharmafleet-frontend-ip --global --format='value(address)'

# Create forwarding rule
gcloud compute forwarding-rules create pharmafleet-frontend-rule \
  --address=pharmafleet-frontend-ip \
  --global \
  --target-http-proxy=pharmafleet-frontend-proxy \
  --ports=80
```

### Step 5.4: Verify Frontend Deployment

```bash
# Direct bucket URL (for testing)
echo "Test URL: https://storage.googleapis.com/pharmafleet-dashboard/index.html"

# Or with CDN IP
FRONTEND_IP=$(gcloud compute addresses describe pharmafleet-frontend-ip --global --format='value(address)')
echo "CDN URL: http://$FRONTEND_IP"
```

---

## Phase 6: Firebase & Mobile Setup (Day 3)

### Step 6.1: Create New Firebase Project

```
1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Project name: pharmafleet-mobile
4. Disable Google Analytics (optional, save costs)
5. Click "Create project"
```

### Step 6.2: Add Android App to Firebase

```
1. In Firebase Console, click "Add app" → Android
2. Android package name: com.pharmafleet.driver
3. App nickname: PharmaFleet Driver
4. Download google-services.json
5. Place in: mobile/driver_app/android/app/google-services.json
```

### Step 6.3: Set Up Firebase App Distribution

```
1. In Firebase Console → App Distribution
2. Click "Get started"
3. Create tester groups:
   - internal: your team emails
   - beta: beta testers
4. Note the Firebase App ID (will need for GitHub Actions)
```

### Step 6.4: Generate Firebase Service Account

```bash
# In Firebase Console → Project Settings → Service Accounts
# Click "Generate new private key"
# Save as firebase-service-account.json

# Base64 encode for GitHub Secret (PowerShell)
$content = Get-Content firebase-service-account.json -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$encoded = [Convert]::ToBase64String($bytes)
$encoded | Set-Clipboard
echo "Copied to clipboard!"
```

### Step 6.5: Generate Android Signing Key (if needed)

```bash
# If you lost the original keystore, create new one
keytool -genkey -v -keystore pharmafleet.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias pharmafleet \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD

# Base64 encode for GitHub Secret (PowerShell)
$bytes = [System.IO.File]::ReadAllBytes("pharmafleet.jks")
$encoded = [Convert]::ToBase64String($bytes)
$encoded | Set-Clipboard
echo "Copied to clipboard!"

# ⚠️ WARNING: If creating new keystore, you'll need to:
# 1. Contact Google Play for upload key reset
# 2. Or create new app listing
```

### Step 6.6: Update Mobile App Configuration

```dart
// mobile/driver_app/lib/core/config/environment.dart
// Update the API URLs

class Environment {
  static const String productionApiUrl = 'https://api.pharmafleet.com/api/v1';
  static const String stagingApiUrl = 'https://api-staging.pharmafleet.com/api/v1';
}
```

---

## Phase 7: CI/CD Pipeline Configuration (Day 3)

### Step 7.1: Configure GitHub Repository Secrets

Go to: GitHub Repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name                      | Value                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GCP_PROJECT_ID`                 | `pharmafleet-prod-XXXXX`                                                                               |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT`            | `github-actions@pharmafleet-prod-XXXXX.iam.gserviceaccount.com`                                        |
| `GCP_FRONTEND_BUCKET`            | `pharmafleet-dashboard`                                                                                |
| `GCP_FRONTEND_BUCKET_STAGING`    | `pharmafleet-dashboard-staging`                                                                        |
| `GOOGLE_MAPS_KEY`                | Your Maps API key                                                                                      |
| `SLACK_WEBHOOK_URL`              | Your Slack webhook URL                                                                                 |
| `ANDROID_KEYSTORE`               | Base64 encoded keystore                                                                                |
| `KEYSTORE_PASSWORD`              | Keystore password                                                                                      |
| `KEY_ALIAS`                      | `pharmafleet`                                                                                          |
| `KEY_PASSWORD`                   | Key password                                                                                           |
| `FIREBASE_APP_ID`                | Firebase App ID                                                                                        |
| `FIREBASE_SERVICE_ACCOUNT`       | Base64 encoded service account JSON                                                                    |

### Step 7.2: Update deploy-backend.yml

Update `.github/workflows/deploy-backend.yml`:

```yaml
env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: me-central1
  SERVICE_NAME: pharmafleet-api
  REPOSITORY: pharmafleet-repo
```

### Step 7.3: Update deploy-frontend.yml

Update `.github/workflows/deploy-frontend.yml`:

```yaml
env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  BUCKET_NAME: ${{ secrets.GCP_FRONTEND_BUCKET }}
  BUCKET_NAME_STAGING: ${{ secrets.GCP_FRONTEND_BUCKET_STAGING }}
```

### Step 7.4: Test CI/CD Pipeline

```bash
# Create a test branch and push
git checkout -b test/cicd-migration
git add .
git commit -m "chore: update CI/CD for new GCP account"
git push origin test/cicd-migration

# Create PR and verify all checks pass
# Then merge to main to trigger deployment
```

---

## Phase 8: DNS & SSL Configuration (Day 3-4)

### Step 8.1: Configure Custom Domain for Backend

```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create \
  --service=pharmafleet-api \
  --domain=api.pharmafleet.com \
  --region=me-central1

# Get DNS records to configure
gcloud run domain-mappings describe \
  --domain=api.pharmafleet.com \
  --region=me-central1
```

### Step 8.2: Update DNS Records

Add these records to your DNS provider (e.g., Cloudflare, GoDaddy):

| Type    | Name              | Value                   | TTL  |
| ------- | ----------------- | ----------------------- | ---- |
| A/CNAME | api               | (from gcloud output)    | 3600 |
| A/CNAME | api-staging       | (staging Cloud Run URL) | 3600 |
| A       | dashboard         | (Frontend CDN IP)       | 3600 |
| CNAME   | staging.dashboard | (staging bucket CNAME)  | 3600 |

### Step 8.3: Configure SSL Certificate for Frontend

```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create pharmafleet-ssl \
  --domains=dashboard.pharmafleet.com \
  --global

# Update target proxy to use HTTPS
gcloud compute target-https-proxies create pharmafleet-frontend-https-proxy \
  --ssl-certificates=pharmafleet-ssl \
  --url-map=pharmafleet-frontend-lb

# Create HTTPS forwarding rule
gcloud compute forwarding-rules create pharmafleet-frontend-https-rule \
  --address=pharmafleet-frontend-ip \
  --global \
  --target-https-proxy=pharmafleet-frontend-https-proxy \
  --ports=443
```

### Step 8.4: Wait for SSL Provisioning

```bash
# Check certificate status (may take 15-60 minutes)
gcloud compute ssl-certificates describe pharmafleet-ssl --global

# Status should change from PROVISIONING to ACTIVE
```

---

## Phase 9: Testing & Verification (Day 4)

### Step 9.1: Backend Verification Checklist

```bash
# Health check
curl https://api.pharmafleet.com/api/v1/utils/health-check

# Database connectivity (login test)
curl -X POST https://api.pharmafleet.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pharmafleet.com","password":"your_password"}'

# Orders endpoint
curl https://api.pharmafleet.com/api/v1/orders?limit=5 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 9.2: Frontend Verification Checklist

- [ ] Navigate to https://dashboard.pharmafleet.com
- [ ] Verify login page loads
- [ ] Login with test credentials
- [ ] Verify dashboard displays data
- [ ] Check orders list loads
- [ ] Verify maps functionality
- [ ] Test driver assignment
- [ ] Check all navigation works

### Step 9.3: Mobile App Verification

```bash
# Build debug APK
cd mobile/driver_app
flutter build apk --debug

# Install on test device
adb install build/app/outputs/flutter-apk/app-debug.apk

# Test:
# - [ ] App launches
# - [ ] Login works
# - [ ] Orders load
# - [ ] Location tracking works
# - [ ] Maps display correctly
```

### Step 9.4: Run E2E Tests

```bash
# Frontend E2E
cd frontend
npm run test:e2e

# Backend tests
cd backend
pytest tests/ -v
```

---

## Post-Migration Tasks

### Immediate (Day 4-5)

- [ ] Update all team members on new credentials
- [ ] Document new project IDs and URLs
- [ ] Set up billing alerts ($50, $100, $200 thresholds)
- [ ] Configure Cloud Monitoring dashboards
- [ ] Set up uptime checks for all services
- [ ] Update README.md with new deployment info

### Short-Term (Week 1-2)

- [ ] Complete Play Store app update (if keystore changed)
- [ ] Set up log-based alerts for errors
- [ ] Configure auto-scaling thresholds based on traffic
- [ ] Implement backup verification schedule
- [ ] Document disaster recovery procedures

### Long-Term Optimization

- [ ] Analyze usage patterns after 30 days
- [ ] Consider Committed Use Discounts if traffic stabilizes
- [ ] Evaluate Cloud SQL upgrade if performance issues
- [ ] Implement Cloud CDN custom caching rules
- [ ] Set up Cloud Armor for DDoS protection

---

## Rollback Procedures

### Backend Rollback

```bash
# List revisions
gcloud run revisions list --service=pharmafleet-api --region=me-central1

# Rollback to previous revision
gcloud run services update-traffic pharmafleet-api \
  --to-revisions=PREVIOUS_REVISION_NAME=100 \
  --region=me-central1
```

### Frontend Rollback

```bash
# Keep backup of last working version
gsutil -m cp -r gs://pharmafleet-dashboard/* gs://pharmafleet-dashboard-backup/

# Rollback from backup
gsutil -m rsync -r -d gs://pharmafleet-dashboard-backup/ gs://pharmafleet-dashboard/
```

### Database Rollback

```bash
# List backups
gcloud sql backups list --instance=pharmafleet-db

# Restore from backup
gcloud sql backups restore BACKUP_ID --restore-instance=pharmafleet-db
```

---

## Cost Monitoring & Optimization

### Set Up Budget Alerts

```bash
# Create budget via Console:
# Billing → Budgets & alerts → Create budget

# Recommended alerts:
# - 50% of budget: Email notification
# - 80% of budget: Email + Slack
# - 100% of budget: All channels + disable non-critical services
```

### Monthly Cost Monitoring

| Service       | Expected Cost | Alert Threshold |
| ------------- | ------------- | --------------- |
| Cloud Run     | $20-40        | $50             |
| Cloud SQL     | $10-30        | $40             |
| Cloud Storage | $5-10         | $15             |
| Cloud CDN     | $10-20        | $25             |
| Upstash Redis | $0-5          | $10             |
| **Total**     | **$45-105**   | **$150**        |

### Cost Optimization Commands

```bash
# Check current month spending
gcloud billing projects describe pharmafleet-prod-XXXXX

# View resource usage
gcloud run services describe pharmafleet-api --region=me-central1 \
  --format='table(status.traffic[].percent,status.traffic[].revisionName)'

# Scale down staging when not in use
gcloud run services update pharmafleet-api-staging \
  --max-instances=0 \
  --region=me-central1
```

---

## Security Checklist

- [ ] Enable VPC Service Controls (optional, enterprise)
- [ ] Configure Cloud Armor rules
- [ ] Enable Cloud Audit Logs
- [ ] Set up IAM least-privilege access
- [ ] Enable Binary Authorization for containers
- [ ] Configure secret rotation reminders
- [ ] Enable 2FA for all GCP users
- [ ] Set up security command center alerts

---

## Support Contacts

| Issue       | Contact                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| GCP Billing | [GCP Support](https://cloud.google.com/support)                              |
| Firebase    | [Firebase Support](https://firebase.google.com/support)                      |
| Domain/DNS  | Your domain registrar                                                        |
| Play Store  | [Play Console Help](https://support.google.com/googleplay/android-developer) |

---

## Appendix A: GitHub Secrets Reference

```
# GCP Core
GCP_PROJECT_ID=pharmafleet-prod-XXXXX
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/XXXXX/locations/global/workloadIdentityPools/github-pool/providers/github-provider
GCP_SERVICE_ACCOUNT=github-actions@pharmafleet-prod-XXXXX.iam.gserviceaccount.com

# GCP Resources
GCP_FRONTEND_BUCKET=pharmafleet-dashboard
GCP_FRONTEND_BUCKET_STAGING=pharmafleet-dashboard-staging

# Application
GOOGLE_MAPS_KEY=AIza...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Android
ANDROID_KEYSTORE=(base64 encoded)
KEYSTORE_PASSWORD=...
KEY_ALIAS=pharmafleet
KEY_PASSWORD=...

# Firebase
FIREBASE_APP_ID=1:XXXXX:android:XXXXX
FIREBASE_SERVICE_ACCOUNT=(base64 encoded)
```

---

## Appendix B: Quick Reference Commands

```bash
# Deploy backend
gcloud run deploy pharmafleet-api --image=IMAGE_URL --region=me-central1

# Deploy frontend
gsutil -m rsync -r -d dist/ gs://pharmafleet-dashboard/

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=pharmafleet-api" --limit=50

# Connect to database
./cloud-sql-proxy pharmafleet-prod-XXXXX:me-central1:pharmafleet-db

# Update secret
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-
```

---

**Document Complete**

For questions or issues, contact the DevOps team.
