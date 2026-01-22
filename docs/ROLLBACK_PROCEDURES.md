# PharmaFleet Deployment Rollback Procedures

## Overview

This document describes the rollback procedures for each component of the PharmaFleet system.

---

## 1. Backend (Cloud Run) Rollback

### Automatic Rollback (via CLI)

```bash
# List recent revisions
gcloud run revisions list --service pharmafleet-api --region me-central1

# Rollback to previous revision
gcloud run services update-traffic pharmafleet-api \
  --to-revisions=pharmafleet-api-00005-abc=100 \
  --region=me-central1

# Verify rollback
gcloud run services describe pharmafleet-api --region me-central1
```

### Rollback via GitHub Actions

1. Go to **Actions** → **Deploy Backend to GCP Cloud Run**
2. Click **Run workflow**
3. Select the previous commit SHA from history
4. Run the deployment

### Emergency Rollback (Direct Image)

```bash
# Deploy specific image version
gcloud run deploy pharmafleet-api \
  --image me-central1-docker.pkg.dev/PROJECT_ID/pharmafleet/pharmafleet-api:PREVIOUS_SHA \
  --region me-central1
```

---

## 2. Frontend (Cloud Storage + CDN) Rollback

### Option A: Restore from Backup Bucket

```bash
# Sync from backup bucket
gsutil -m rsync -r gs://pharmafleet-dashboard-backup gs://pharmafleet-dashboard

# Invalidate CDN cache
gcloud compute url-maps invalidate-cdn-cache pharmafleet-cdn --path "/*"
```

### Option B: Redeploy Previous Commit

1. Go to **Actions** → **Deploy Frontend to Cloud Storage + CDN**
2. Click **Run workflow**
3. Select **production** environment
4. Manually checkout the previous commit and re-run

### Option C: Object Versioning Restore

```bash
# List object versions
gsutil ls -la gs://pharmafleet-dashboard/index.html

# Restore specific version
gsutil cp gs://pharmafleet-dashboard/index.html#1234567890 gs://pharmafleet-dashboard/index.html
```

---

## 3. Mobile App Rollback

### Android (Play Store)

1. Go to **Google Play Console** → **Release Management** → **App Releases**
2. Click **Managed Publishing**
3. **Halt rollout** of the current release
4. If needed, upload the previous APK as a new release

### Direct APK Distribution

```bash
# Download previous APK from GitHub Artifacts
# Re-distribute via internal channels
```

---

## 4. Database Rollback

### Point-in-Time Recovery (PITR)

```bash
# For Cloud SQL
gcloud sql instances clone SOURCE_INSTANCE TARGET_INSTANCE \
  --point-in-time "2026-01-22T00:00:00Z"

# Update connection string to point to restored instance
```

### Restore from Backup

```bash
# List available backups
ls -la /var/backups/pharmafleet/

# Restore specific backup
pg_restore -h localhost -U pharmafleet_admin -d pharmafleet_restored \
  /var/backups/pharmafleet/pharmafleet_20260122_020000.sql.gz
```

### Migration Rollback (Alembic)

```bash
cd backend

# View current revision
alembic current

# Downgrade one revision
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade abc123def456
```

---

## 5. Rollback Decision Matrix

| Severity      | Response Time     | Action                     |
| ------------- | ----------------- | -------------------------- |
| Critical (P0) | < 15 minutes      | Immediate rollback via CLI |
| High (P1)     | < 1 hour          | GitHub Actions rollback    |
| Medium (P2)   | < 4 hours         | Investigate then decide    |
| Low (P3)      | Next business day | Standard fix and deploy    |

---

## 6. Rollback Checklist

### Before Rollback

- [ ] Confirm the issue is caused by the new deployment
- [ ] Notify team via Slack/Discord
- [ ] Document the issue symptoms

### During Rollback

- [ ] Execute rollback command
- [ ] Monitor logs for errors
- [ ] Verify service health endpoints

### After Rollback

- [ ] Confirm service is stable
- [ ] Update incident channel
- [ ] Create post-mortem ticket
- [ ] Review and fix the original issue

---

## 7. Emergency Contacts

| Role                | Contact               | Escalation Path |
| ------------------- | --------------------- | --------------- |
| On-call Engineer    | [Slack: #oncall]      | Primary         |
| DevOps Lead         | [Slack: @devops-lead] | Secondary       |
| Engineering Manager | [Phone/Slack]         | Tertiary        |

---

## 8. Monitoring During Rollback

```bash
# Backend health check
curl https://api.pharmafleet.com/api/v1/utils/health-check

# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=pharmafleet-api" --limit 50

# Check error rate
gcloud monitoring read "metric.type=run.googleapis.com/request_count" --filter="metric.labels.response_code_class!=2xx"
```

---

**Last Updated:** 2026-01-22  
**Version:** 1.0.0
