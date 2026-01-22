# Cloud SQL Production Setup Guide

## Overview

This guide covers setting up Cloud SQL PostgreSQL with PostGIS for PharmaFleet production.

---

## 1. Create Cloud SQL Instance

### Via gcloud CLI

```bash
# Create PostgreSQL 15 instance with high availability
gcloud sql instances create pharmafleet-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=me-central1 \
  --availability-type=REGIONAL \
  --storage-type=SSD \
  --storage-size=50GB \
  --storage-auto-increase \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=03 \
  --database-flags=max_connections=200,log_min_duration_statement=1000

# Create database
gcloud sql databases create pharmafleet --instance=pharmafleet-db

# Create application user
gcloud sql users create pharmafleet_api \
  --instance=pharmafleet-db \
  --password="$(openssl rand -base64 32)"
```

---

## 2. Enable PostGIS Extension

Connect to the database and run:

```sql
-- Connect as postgres superuser first
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify installation
SELECT PostGIS_Version();
```

---

## 3. Configure Connection

### Cloud Run Connection

Cloud Run uses Cloud SQL Proxy automatically via Unix socket:

```yaml
# In Cloud Run deployment
--add-cloudsql-instances=PROJECT_ID:REGION:pharmafleet-db
--set-env-vars=DATABASE_URL=postgresql+asyncpg://pharmafleet_api:PASSWORD@/pharmafleet?host=/cloudsql/PROJECT_ID:me-central1:pharmafleet-db
```

### Local Development (Cloud SQL Proxy)

```bash
# Download and run Cloud SQL Proxy
./cloud-sql-proxy PROJECT_ID:me-central1:pharmafleet-db \
  --port=5432 \
  --credentials-file=service-account.json
```

---

## 4. Backup Configuration

### Automated Backups

Already configured with instance creation:

- **Daily backups**: 02:00 UTC
- **Retention**: 7 days
- **Point-in-time recovery**: Enabled (7 days)

### Manual Backup

```bash
gcloud sql backups create \
  --instance=pharmafleet-db \
  --description="Pre-migration backup"
```

### Export to Cloud Storage

```bash
gcloud sql export sql pharmafleet-db \
  gs://pharmafleet-backups/pharmafleet-$(date +%Y%m%d).sql \
  --database=pharmafleet
```

---

## 5. High Availability Configuration

Regional HA is enabled by default (`--availability-type=REGIONAL`).

This provides:

- Automatic failover to standby
- Minimal downtime (~minutes)
- No data loss during failover

### Failover Testing

```bash
# Trigger manual failover (for testing)
gcloud sql instances failover pharmafleet-db
```

---

## 6. Security

### Private IP (Recommended for Production)

```bash
# Enable private IP
gcloud sql instances patch pharmafleet-db \
  --network=default \
  --no-assign-ip
```

### SSL/TLS Enforcement

```bash
gcloud sql instances patch pharmafleet-db \
  --require-ssl

# Download SSL certificates
gcloud sql ssl client-certs create pharmafleet-client \
  --instance=pharmafleet-db
gcloud sql ssl client-certs describe pharmafleet-client \
  --instance=pharmafleet-db \
  --format="get(cert)" > client-cert.pem
```

---

## 7. Monitoring

### Enable Cloud Monitoring

Automatically enabled. View in Cloud Console:

- CPU utilization
- Memory usage
- Disk usage
- Connections
- Query latency

### Alerting Policies

```bash
# Create alert for high CPU
gcloud alpha monitoring policies create \
  --display-name="Cloud SQL High CPU" \
  --condition-filter='metric.type="cloudsql.googleapis.com/database/cpu/utilization" resource.type="cloudsql_database"' \
  --condition-threshold-value=0.8 \
  --notification-channels=CHANNEL_ID
```

---

## 8. Connection Pooling (PgBouncer)

For high-concurrency workloads, deploy PgBouncer:

```yaml
# Cloud Run PgBouncer sidecar
apiVersion: serving.knative.dev/v1
kind: Service
spec:
  template:
    spec:
      containers:
        - name: pgbouncer
          image: edoburu/pgbouncer
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          ports:
            - containerPort: 5432
```

---

## 9. Database Migrations

### Run Migrations in Production

```bash
# Via Cloud Run Job
gcloud run jobs create pharmafleet-migrations \
  --image=REGION-docker.pkg.dev/PROJECT/pharmafleet/api:latest \
  --command="alembic,upgrade,head" \
  --set-cloudsql-instances=PROJECT:REGION:pharmafleet-db \
  --set-secrets="DATABASE_URL=pharmafleet-db-url:latest"

gcloud run jobs execute pharmafleet-migrations
```

---

## 10. Cost Optimization

| Instance Type     | vCPUs  | Memory | Cost/Month (approx) |
| ----------------- | ------ | ------ | ------------------- |
| db-f1-micro       | Shared | 0.6GB  | $10                 |
| db-custom-1-3840  | 1      | 3.75GB | $50                 |
| db-custom-2-7680  | 2      | 7.5GB  | $100                |
| db-custom-4-15360 | 4      | 15GB   | $200                |

**Recommendations:**

- Start with db-custom-2-7680 for production
- Scale up based on monitoring metrics
- Consider read replicas for heavy analytics

---

## Quick Reference

| Resource      | Value           |
| ------------- | --------------- |
| Instance Name | pharmafleet-db  |
| Region        | me-central1     |
| Database      | pharmafleet     |
| App User      | pharmafleet_api |
| Backup Time   | 02:00 UTC       |
| Maintenance   | Sunday 03:00    |
