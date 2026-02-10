"""
Database Configuration for PharmaFleet
Connection pooling, roles, and performance settings
"""

from app.core.config import settings


# Connection Pool Configuration
POOL_CONFIG = {
    "pool_size": 25,  # Number of connections to keep open
    "max_overflow": 10,  # Additional connections that can be created
    "pool_timeout": 30,  # Seconds to wait for available connection
    "pool_recycle": 1800,  # Recycle connections after 30 minutes
    "pool_pre_ping": True,  # Verify connections before use
}


def get_database_url(role: str = "api") -> str:
    """
    Get database URL for specific role.

    Roles:
    - admin: Full privileges (migrations, schema changes)
    - api: Application access (CRUD operations)
    - readonly: Read-only access (reporting, analytics)
    """
    role_users = {
        "admin": settings.DATABASE_ADMIN_USER,
        "api": settings.DATABASE_API_USER,
        "readonly": settings.DATABASE_READONLY_USER,
    }

    role_passwords = {
        "admin": settings.DATABASE_ADMIN_PASSWORD,
        "api": settings.DATABASE_API_PASSWORD,
        "readonly": settings.DATABASE_READONLY_PASSWORD,
    }

    user = role_users.get(role, settings.DATABASE_API_USER)
    password = role_passwords.get(role, settings.DATABASE_API_PASSWORD)

    return (
        f"postgresql+asyncpg://{user}:{password}@"
        f"{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/"
        f"{settings.POSTGRES_DB}"
    )


# Performance Indexes SQL
PERFORMANCE_INDEXES = """
-- Order Performance Indexes
CREATE INDEX IF NOT EXISTS idx_order_status ON "order" (status);
CREATE INDEX IF NOT EXISTS idx_order_driver_id ON "order" (driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_warehouse_id ON "order" (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_order_created_at ON "order" (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_warehouse ON "order" (status, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_order_sales_order_number ON "order" (sales_order_number);

-- Driver Performance Indexes
CREATE INDEX IF NOT EXISTS idx_driver_warehouse_id ON driver (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_driver_is_available ON driver (is_available);
CREATE INDEX IF NOT EXISTS idx_driver_user_id ON driver (user_id);

-- User Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_role ON "user" (role);
CREATE INDEX IF NOT EXISTS idx_user_is_active ON "user" (is_active);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user" (email);

-- Location Tracking Indexes
CREATE INDEX IF NOT EXISTS idx_driver_location_driver_timestamp 
    ON driver_location (driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_driver_location_timestamp 
    ON driver_location (timestamp DESC);

-- Payment Tracking Indexes
CREATE INDEX IF NOT EXISTS idx_payment_driver_status 
    ON payment_collection (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_collection (status);
CREATE INDEX IF NOT EXISTS idx_payment_collected_at 
    ON payment_collection (collected_at DESC);

-- Notification Indexes
CREATE INDEX IF NOT EXISTS idx_notification_user_unread 
    ON notification (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notification_created_at 
    ON notification (created_at DESC);

-- Order Status History Indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id 
    ON order_status_history (order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_timestamp 
    ON order_status_history (timestamp DESC);

-- Geospatial Index for Warehouse
CREATE INDEX IF NOT EXISTS idx_warehouse_location 
    ON warehouse USING GIST (location);
"""


# Database Roles Setup SQL
DATABASE_ROLES_SQL = """
-- Create roles if they don't exist
DO $$
BEGIN
    -- Admin role (full access)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pharmafleet_admin') THEN
        CREATE ROLE pharmafleet_admin WITH LOGIN PASSWORD '{admin_password}';
    END IF;
    
    -- API role (application access)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pharmafleet_api') THEN
        CREATE ROLE pharmafleet_api WITH LOGIN PASSWORD '{api_password}';
    END IF;
    
    -- Readonly role (reporting)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pharmafleet_readonly') THEN
        CREATE ROLE pharmafleet_readonly WITH LOGIN PASSWORD '{readonly_password}';
    END IF;
    
    -- Backup role
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pharmafleet_backup') THEN
        CREATE ROLE pharmafleet_backup WITH LOGIN PASSWORD '{backup_password}';
    END IF;
END
$$;

-- Grant permissions to admin
GRANT ALL PRIVILEGES ON DATABASE pharmafleet TO pharmafleet_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pharmafleet_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pharmafleet_admin;

-- Grant permissions to API role
GRANT CONNECT ON DATABASE pharmafleet TO pharmafleet_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pharmafleet_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pharmafleet_api;

-- Grant permissions to readonly role
GRANT CONNECT ON DATABASE pharmafleet TO pharmafleet_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pharmafleet_readonly;

-- Grant permissions to backup role
GRANT CONNECT ON DATABASE pharmafleet TO pharmafleet_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pharmafleet_backup;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pharmafleet_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO pharmafleet_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT USAGE, SELECT ON SEQUENCES TO pharmafleet_api;
"""


# PostGIS Setup SQL
POSTGIS_SETUP_SQL = """
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify PostGIS installation
SELECT PostGIS_Version();
"""


# Partitioning for driver_location table
LOCATION_PARTITIONING_SQL = """
-- Create partitioned driver_location table
CREATE TABLE IF NOT EXISTS driver_location_partitioned (
    id BIGSERIAL,
    driver_id INTEGER NOT NULL REFERENCES driver(id),
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    accuracy DECIMAL(6, 2),
    speed DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    timestamp TIMESTAMP NOT NULL,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partition for current month
CREATE TABLE IF NOT EXISTS driver_location_y{year}m{month:02d} 
    PARTITION OF driver_location_partitioned
    FOR VALUES FROM ('{year}-{month:02d}-01') 
    TO ('{next_year}-{next_month:02d}-01');

-- Create index on partitioned table
CREATE INDEX IF NOT EXISTS idx_driver_location_part_driver_timestamp 
    ON driver_location_partitioned (driver_id, timestamp DESC);
"""
