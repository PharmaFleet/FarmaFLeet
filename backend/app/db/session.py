import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Detect serverless environment (Vercel, AWS Lambda, etc.)
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

# Use minimal pool for serverless, larger pool for traditional deployments
if IS_SERVERLESS:
    # Serverless + PgBouncer: disable prepared statements, short timeouts,
    # aggressive recycling to avoid stale connections between invocations
    engine = create_async_engine(
        str(settings.SQLALCHEMY_DATABASE_URI),
        connect_args={
            "statement_cache_size": 0,
            "command_timeout": 15,
            "server_settings": {"jit": "off"},
        },
        pool_pre_ping=True,
        pool_size=2,
        max_overflow=3,
        pool_timeout=10,
        pool_recycle=60,
    )
else:
    engine = create_async_engine(
        str(settings.SQLALCHEMY_DATABASE_URI),
        connect_args={
            "statement_cache_size": 128,
            "command_timeout": 30,
        },
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
    )

SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
