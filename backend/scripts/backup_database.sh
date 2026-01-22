#!/bin/bash
# PharmaFleet Database Backup Script
# Schedule via cron: 0 2 * * * /path/to/backup_database.sh

set -e

# Configuration
DB_HOST="${POSTGRES_SERVER:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-pharmafleet}"
DB_USER="${POSTGRES_USER:-pharmafleet_backup}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pharmafleet}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"  # Optional: s3://bucket-name/backups
AZURE_CONTAINER="${AZURE_CONTAINER:-}"  # Optional: Azure blob container

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pharmafleet_${TIMESTAMP}.sql.gz"

echo "=== PharmaFleet Database Backup ==="
echo "Timestamp: $TIMESTAMP"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Create backup
echo ""
echo "1. Creating database backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "   Backup size: $BACKUP_SIZE"

# Calculate checksum
CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
echo "   SHA256: $CHECKSUM"
echo "$CHECKSUM" > "${BACKUP_FILE}.sha256"

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    echo ""
    echo "2. Uploading to S3..."
    aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/$(basename $BACKUP_FILE)"
    aws s3 cp "${BACKUP_FILE}.sha256" "$S3_BUCKET/$(basename $BACKUP_FILE).sha256"
    echo "   Uploaded to: $S3_BUCKET"
fi

# Upload to Azure if configured
if [ -n "$AZURE_CONTAINER" ]; then
    echo ""
    echo "2. Uploading to Azure Blob Storage..."
    az storage blob upload \
        --container-name "$AZURE_CONTAINER" \
        --file "$BACKUP_FILE" \
        --name "$(basename $BACKUP_FILE)"
    echo "   Uploaded to: $AZURE_CONTAINER"
fi

# Clean up old backups
echo ""
echo "3. Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "pharmafleet_*.sql.gz*" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/pharmafleet_*.sql.gz 2>/dev/null | wc -l)
echo "   Remaining backups: $REMAINING"

echo ""
echo "=== Backup Complete ==="
echo ""
echo "To restore from this backup:"
echo "  pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME $BACKUP_FILE"
