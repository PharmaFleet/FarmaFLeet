"""
Fixtures and configuration for backend integration tests.
Uses SQLite in-memory database for fast integration testing.
"""

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from geoalchemy2 import Geometry
from sqlalchemy.dialects.postgresql import JSONB
import geoalchemy2.admin.dialects.sqlite as sqlite_dialect

from app.main import app
from app.core.security import create_access_token
from app.db.base_class import Base
from app.api.deps import get_db

# --- PATCHING FOR SQLITE ---


# 1. Compile Geometry columns as BLOB for SQLite
@compiles(Geometry, "sqlite")
def compile_geometry_sqlite(type_, compiler, **kw):
    return "BLOB"


# 2. Compile JSONB columns as JSON for SQLite
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


# 3. Disable GeoAlchemy2 SQLite management hooks
# These hooks try to call SpatiaLite functions which don't exist in standard SQLite
def no_op(*args, **kwargs):
    pass


sqlite_dialect.before_create = no_op
sqlite_dialect.after_create = no_op
sqlite_dialect.before_drop = no_op
sqlite_dialect.after_drop = no_op
sqlite_dialect.reflect_geometry_column = no_op


# Use SQLite for fast, in-memory testing (no Docker required)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


# Create engine at module level for reuse
_engine = None
_async_session_maker = None


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event_loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    """Set up the test database once for the entire test session."""
    global _engine, _async_session_maker

    _engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    # Create all tables
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    _async_session_maker = sessionmaker(
        _engine, class_=AsyncSession, expire_on_commit=False
    )

    yield

    # Clean up
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await _engine.dispose()


@pytest.fixture(autouse=True)
def mock_redis():
    """Mock Redis client for all tests to avoid connection errors."""
    with patch("redis.asyncio.from_url") as mock_from_url:
        mock_client = AsyncMock()
        mock_client.get.return_value = None
        mock_client.set.return_value = None
        mock_client.incr.return_value = 1
        mock_client.expire.return_value = True
        mock_client.delete.return_value = 1
        mock_client.keys.return_value = []
        mock_from_url.return_value = mock_client
        yield mock_client


@pytest.fixture(scope="function")
def client() -> Generator:
    """Create test client with mocked database."""
    # Create a mock session that returns empty results
    mock_session = MagicMock()
    mock_session.execute = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    mock_session.close = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.get = AsyncMock(return_value=None)
    mock_session.add = MagicMock()

    # Mock result object
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_result.scalars.return_value.first.return_value = None
    mock_result.unique.return_value.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def async_client() -> AsyncGenerator:
    """Create async test client with mocked database."""
    mock_session = MagicMock()
    mock_session.execute = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    mock_session.close = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.get = AsyncMock(return_value=None)
    mock_session.add = MagicMock()

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_result.scalars.return_value.first.return_value = None
    mock_session.execute.return_value = mock_result

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def admin_token_headers() -> dict[str, str]:
    """Return headers for an admin user (ID 1)."""
    token = create_access_token(subject="1")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def driver_token_headers() -> dict[str, str]:
    """Return headers for a driver user (ID 2)."""
    token = create_access_token(subject="2")
    return {"Authorization": f"Bearer {token}"}
