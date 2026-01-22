# PharmaFleet Environment Configuration

## Staging Environment

### Backend

- **Service:** Cloud Run (pharmafleet-api-staging)
- **Region:** me-central1 (Kuwait)
- **URL:** https://api-staging.pharmafleet.com
- **Database:** Cloud SQL (pharmafleet-db-staging)
- **Redis:** Memorystore (pharmafleet-redis-staging)

### Frontend

- **Bucket:** gs://pharmafleet-dashboard-staging
- **CDN URL:** https://staging.dashboard.pharmafleet.com
- **Cache TTL:** 1 hour (JS/CSS), no-cache (HTML)

### Mobile

- **API Endpoint:** https://api-staging.pharmafleet.com/api/v1
- **Build Type:** Debug APK

---

## Production Environment

### Backend

- **Service:** Cloud Run (pharmafleet-api)
- **Region:** me-central1 (Kuwait)
- **URL:** https://api.pharmafleet.com
- **Database:** Cloud SQL (pharmafleet-db) - High Availability
- **Redis:** Memorystore (pharmafleet-redis) - Standard Tier

### Frontend

- **Bucket:** gs://pharmafleet-dashboard
- **CDN URL:** https://dashboard.pharmafleet.com
- **Cache TTL:** 1 year (JS/CSS with hash), no-cache (HTML)

### Mobile

- **API Endpoint:** https://api.pharmafleet.com/api/v1
- **Build Type:** Release APK (signed)
- **Distribution:** Play Store Internal Track

---

## Environment Variables

### Required Secrets (GitHub)

| Secret Name                      | Description                  | Environments |
| -------------------------------- | ---------------------------- | ------------ |
| `GCP_PROJECT_ID`                 | Google Cloud Project ID      | All          |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Federation | All          |
| `GCP_SERVICE_ACCOUNT`            | Service Account Email        | All          |
| `SLACK_WEBHOOK_URL`              | Slack notification webhook   | All          |
| `GOOGLE_MAPS_KEY`                | Google Maps API key          | All          |
| `ANDROID_KEYSTORE`               | Base64 encoded keystore      | Production   |
| `KEYSTORE_PASSWORD`              | Keystore password            | Production   |
| `KEY_ALIAS`                      | Signing key alias            | Production   |
| `KEY_PASSWORD`                   | Signing key password         | Production   |

### Backend Environment Variables

| Variable       | Staging               | Production                |
| -------------- | --------------------- | ------------------------- |
| `ENVIRONMENT`  | staging               | production                |
| `DEBUG`        | true                  | false                     |
| `LOG_LEVEL`    | DEBUG                 | INFO                      |
| `CORS_ORIGINS` | \*                    | dashboard.pharmafleet.com |
| `DATABASE_URL` | (from Secret Manager) | (from Secret Manager)     |
| `REDIS_URL`    | (from Secret Manager) | (from Secret Manager)     |
| `SECRET_KEY`   | (from Secret Manager) | (from Secret Manager)     |

### Frontend Environment Variables

| Variable               | Staging                                    | Production                         |
| ---------------------- | ------------------------------------------ | ---------------------------------- |
| `VITE_API_URL`         | https://api-staging.pharmafleet.com/api/v1 | https://api.pharmafleet.com/api/v1 |
| `VITE_GOOGLE_MAPS_KEY` | (from GitHub Secrets)                      | (from GitHub Secrets)              |
| `VITE_SENTRY_DSN`      | (staging DSN)                              | (production DSN)                   |

---

## Resource Allocation

### Staging

| Resource    | CPU | Memory | Min Instances | Max Instances |
| ----------- | --- | ------ | ------------- | ------------- |
| Cloud Run   | 1   | 512Mi  | 0             | 10            |
| Cloud SQL   | 1   | 3.75GB | -             | -             |
| Memorystore | -   | 1GB    | -             | -             |

### Production

| Resource    | CPU | Memory | Min Instances | Max Instances |
| ----------- | --- | ------ | ------------- | ------------- |
| Cloud Run   | 2   | 1Gi    | 1             | 50            |
| Cloud SQL   | 2   | 7.5GB  | -             | -             |
| Memorystore | -   | 5GB    | -             | -             |

---

## Deployment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   develop   │────▶│   staging   │────▶│ production  │
│   branch    │     │ environment │     │ environment │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                    │
     │ Push               │ Auto-deploy        │ Manual approval
     │                    │ on merge           │ required
     ▼                    ▼                    ▼
  PR Tests            Staging Tests      Production Deploy
```

---

## Monitoring URLs

| Environment | Service       | URL                                                           |
| ----------- | ------------- | ------------------------------------------------------------- |
| Staging     | API Health    | https://api-staging.pharmafleet.com/api/v1/utils/health-check |
| Staging     | Dashboard     | https://staging.dashboard.pharmafleet.com                     |
| Production  | API Health    | https://api.pharmafleet.com/api/v1/utils/health-check         |
| Production  | Dashboard     | https://dashboard.pharmafleet.com                             |
| All         | Cloud Console | https://console.cloud.google.com/run                          |
| All         | Logs          | https://console.cloud.google.com/logs                         |

---

**Last Updated:** 2026-01-22
