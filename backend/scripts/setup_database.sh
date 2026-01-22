#!/bin/bash
# PharmaFleet Database Setup Script
# Run this script to initialize the database with PostGIS, roles, and indexes

set -e

# Configuration
DB_HOST="${POSTGRES_SERVER:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-pharmafleet}"
DB_USER="${POSTGRES_USER:-postgres}"

echo "=== PharmaFleet Database Setup ==="
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"

# Function to run SQL
run_sql() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

run_sql_file() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$1"
}

echo ""
echo "1. Installing PostGIS extension..."
run_sql "CREATE EXTENSION IF NOT EXISTS postgis;"
run_sql "CREATE EXTENSION IF NOT EXISTS postgis_topology;"
echo "   PostGIS Version: $(run_sql "SELECT PostGIS_Version();" -t)"

echo ""
echo "2. Creating database roles..."
run_sql "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pharmafleet_admin') THEN
        CREATE ROLE pharmafleet_admin WITH LOGIN PASSWORD '${DB_ADMIN_PASSWORD:-admin_secret}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pharmafleet_api') THEN
        CREATE ROLE pharmafleet_api WITH LOGIN PASSWORD '${DB_API_PASSWORD:-api_secret}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pharmafleet_readonly') THEN
        CREATE ROLE pharmafleet_readonly WITH LOGIN PASSWORD '${DB_READONLY_PASSWORD:-readonly_secret}';
    END IF;
END
\$\$;
"

echo ""
echo "3. Granting permissions..."
run_sql "
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO pharmafleet_admin;
GRANT CONNECT ON DATABASE $DB_NAME TO pharmafleet_api;
GRANT CONNECT ON DATABASE $DB_NAME TO pharmafleet_readonly;
"

echo ""
echo "4. Creating performance indexes..."
run_sql "
-- Order indexes
CREATE INDEX IF NOT EXISTS idx_order_status ON \"order\" (status);
CREATE INDEX IF NOT EXISTS idx_order_driver_id ON \"order\" (driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_warehouse_id ON \"order\" (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_order_created_at ON \"order\" (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_warehouse ON \"order\" (status, warehouse_id);

-- Driver indexes
CREATE INDEX IF NOT EXISTS idx_driver_warehouse_id ON driver (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_driver_is_available ON driver (is_available);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_role ON \"user\" (role);
CREATE INDEX IF NOT EXISTS idx_user_is_active ON \"user\" (is_active);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payment_driver_status ON payment_collection (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_collection (status);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_user_unread ON notification (user_id, is_read) WHERE is_read = FALSE;

-- Geospatial index
CREATE INDEX IF NOT EXISTS idx_warehouse_location ON warehouse USING GIST (location);
"

echo ""
echo "5. Setting up table permissions..."
run_sql "
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pharmafleet_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pharmafleet_api;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pharmafleet_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pharmafleet_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO pharmafleet_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT USAGE, SELECT ON SEQUENCES TO pharmafleet_api;
"

echo ""
echo "=== Database Setup Complete ==="
echo ""
echo "Database roles created:"
echo "  - pharmafleet_admin (admin access)"
echo "  - pharmafleet_api (application access)"
echo "  - pharmafleet_readonly (read-only access)"
echo ""
echo "Performance indexes created for all tables."
echo "PostGIS extension enabled for geospatial queries."
