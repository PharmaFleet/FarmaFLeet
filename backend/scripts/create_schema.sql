-- Create User table first (required by superadmin insert)
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL NOT NULL PRIMARY KEY,
    full_name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    hashed_password VARCHAR NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_superuser BOOLEAN NOT NULL DEFAULT false,
    role VARCHAR NOT NULL DEFAULT 'user'
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_user_email ON "user" (email);
CREATE INDEX IF NOT EXISTS ix_user_full_name ON "user" (full_name);
CREATE INDEX IF NOT EXISTS ix_user_id ON "user" (id);
CREATE INDEX IF NOT EXISTS ix_user_role ON "user" (role);

-- Create Warehouse table  
CREATE TABLE IF NOT EXISTS warehouse (
    id SERIAL NOT NULL PRIMARY KEY,
    code VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    location geometry(POINT,4326) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_warehouse_code ON warehouse (code);
CREATE INDEX IF NOT EXISTS ix_warehouse_id ON warehouse (id);
CREATE INDEX IF NOT EXISTS idx_warehouse_location ON warehouse USING gist (location);

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS auditlog (
    id SERIAL NOT NULL PRIMARY KEY,
    user_id INTEGER REFERENCES "user"(id),
    action VARCHAR NOT NULL,
    resource_type VARCHAR NOT NULL,
    resource_id VARCHAR,
    details JSON,
    ip_address VARCHAR,
    timestamp TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_auditlog_id ON auditlog (id);
CREATE INDEX IF NOT EXISTS ix_auditlog_action ON auditlog (action);
CREATE INDEX IF NOT EXISTS ix_auditlog_resource_type ON auditlog (resource_type);

-- Create Driver table
CREATE TABLE IF NOT EXISTS driver (
    id SERIAL NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id),
    warehouse_id INTEGER REFERENCES warehouse(id),
    biometric_id VARCHAR,
    vehicle_info VARCHAR,
    is_available BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS ix_driver_id ON driver (id);

-- Create Notification table
CREATE TABLE IF NOT EXISTS notification (
    id SERIAL NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    title VARCHAR NOT NULL,
    body VARCHAR NOT NULL,
    data JSON,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_notification_id ON notification (id);
CREATE INDEX IF NOT EXISTS ix_notification_user_id ON notification (user_id);

-- Create DriverLocation table
CREATE TABLE IF NOT EXISTS driverlocation (
    id SERIAL NOT NULL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES driver(id),
    location geometry(POINT,4326) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_driverlocation_id ON driverlocation (id);
CREATE INDEX IF NOT EXISTS ix_driverlocation_driver_id ON driverlocation (driver_id);
CREATE INDEX IF NOT EXISTS ix_driverlocation_timestamp ON driverlocation (timestamp);
CREATE INDEX IF NOT EXISTS idx_driverlocation_location ON driverlocation USING gist (location);

-- Create Order table
CREATE TABLE IF NOT EXISTS "order" (
    id SERIAL NOT NULL PRIMARY KEY,
    sales_order_number VARCHAR NOT NULL,
    customer_info JSONB NOT NULL,
    status VARCHAR NOT NULL,
    payment_method VARCHAR NOT NULL,
    total_amount FLOAT NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES warehouse(id),
    driver_id INTEGER REFERENCES driver(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_order_sales_order_number ON "order" (sales_order_number);
CREATE INDEX IF NOT EXISTS ix_order_id ON "order" (id);
CREATE INDEX IF NOT EXISTS ix_order_status ON "order" (status);
CREATE INDEX IF NOT EXISTS ix_order_warehouse_id ON "order" (warehouse_id);
CREATE INDEX IF NOT EXISTS ix_order_driver_id ON "order" (driver_id);

-- Create OrderStatusHistory table
CREATE TABLE IF NOT EXISTS orderstatushistory (
    id SERIAL NOT NULL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES "order"(id),
    status VARCHAR NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    notes TEXT
);

-- Create PaymentMethod enum type
DO $$ BEGIN
    CREATE TYPE paymentmethod AS ENUM ('CASH', 'KNET', 'CREDIT_CARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PaymentCollection table
CREATE TABLE IF NOT EXISTS paymentcollection (
    id SERIAL NOT NULL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES "order"(id),
    driver_id INTEGER NOT NULL REFERENCES driver(id),
    amount FLOAT NOT NULL,
    method paymentmethod NOT NULL,
    transaction_id VARCHAR,
    collected_at TIMESTAMP NOT NULL,
    verified_by_id INTEGER REFERENCES "user"(id),
    verified_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_paymentcollection_id ON paymentcollection (id);

-- Create ProofOfDelivery table
CREATE TABLE IF NOT EXISTS proofofdelivery (
    id SERIAL NOT NULL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES "order"(id),
    signature_url VARCHAR,
    photo_url VARCHAR,
    timestamp TIMESTAMP NOT NULL
);
