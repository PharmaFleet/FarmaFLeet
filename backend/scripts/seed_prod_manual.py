import psycopg2
import os
from contextlib import contextmanager
from app.core.security import get_password_hash

# Use settings from environment or default (but we will override via env vars)
# For prod script, we construct URL manually or trust env settings if set correctly.
# But settings currently point to localhost in local env.


def create_superadmin():
    print("Starting production superadmin seeding (Sync Mode)...")

    server = (
        os.environ.get("POSTGRES_SERVER", "34.18.88.94").strip().strip("'").strip('"')
    )
    user = os.environ.get("POSTGRES_USER", "api_user")
    password = os.environ.get("POSTGRES_PASSWORD", "Arrm@3123")
    db_name = os.environ.get("POSTGRES_DB", "pharmafleet")

    print(f"Connecting to {server} as {user}...")

    try:
        conn = psycopg2.connect(
            host=server, database=db_name, user=user, password=password, port="5432"
        )
        conn.autocommit = True

        with conn.cursor() as cur:
            # Create users table if not exists (Basic schema for superadmin login)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    full_name VARCHAR(255),
                    email VARCHAR(255) UNIQUE NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    is_superuser BOOLEAN DEFAULT FALSE,
                    role VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            print("Ensured users table exists.")

            # Check if user exists
            cur.execute(
                "SELECT id FROM users WHERE email = %s", ("admin@pharmafleet.com",)
            )
            existing = cur.fetchone()

            if existing:
                print("Superadmin already exists.")
            else:
                hashed_pw = get_password_hash("admin123")
                # We need to manually insert because we aren't using the ORM models
                # This assumes the table exists (it should from Cloud Run deployment)
                cur.execute(
                    """
                    INSERT INTO users (full_name, email, hashed_password, is_active, is_superuser, role)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        "System Administrator",
                        "admin@pharmafleet.com",
                        hashed_pw,
                        True,
                        True,
                        "SUPER_ADMIN",
                    ),
                )
                print("Superadmin created successfully!")

        conn.close()

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    create_superadmin()
