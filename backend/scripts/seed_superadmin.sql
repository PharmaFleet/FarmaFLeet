-- Create superadmin user if not exists
INSERT INTO "user" (full_name, email, hashed_password, is_active, is_superuser, role)
SELECT 'System Administrator', 'admin@pharmafleet.com', '$2b$12$7AIJUXV.WAX0e7qNHbwDJua/zS/a1XL9/MQ./QkgOQNpzdw7tHHW6', true, true, 'superadmin'
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE email = 'admin@pharmafleet.com');
