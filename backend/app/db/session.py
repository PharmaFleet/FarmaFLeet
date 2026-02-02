import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Detect serverless environment (Vercel, AWS Lambda, etc.)
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

# Use minimal pool for serverless, larger pool for traditional deployments
if IS_SERVERLESS:
    engine = create_async_engine(
        str(settings.SQLALCHEMY_DATABASE_URI),
        pool_pre_ping=True,
        pool_size=1,  # Minimal for serverless
        max_overflow=2,
        pool_recycle=300,  # Recycle connections after 5 min
    )
else:
    engine = create_async_engine(
        str(settings.SQLALCHEMY_DATABASE_URI),
        connect_args={"statement_cache_size": 128},  # Enable statement caching (15-30% performance boost)
        pool_pre_ping=True,  # Verify connections before using them
        pool_size=20,  # Increase pool size for better concurrency
        max_overflow=10,  # Allow temporary overflow connections
    )

SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
