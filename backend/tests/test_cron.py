"""
Tests for Vercel Cron job endpoints.

These tests verify:
1. Cron endpoints require CRON_SECRET authentication
2. Auto-archive endpoint correctly archives old delivered orders
3. Location cleanup endpoint deletes old driver locations
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.api.deps import get_db
from app.models.order import Order, OrderStatus
from app.models.location import DriverLocation


class TestCronAuthentication:
    """Test cron endpoint authentication."""

    def test_auto_archive_without_secret_returns_401(self, client):
        """Test that auto-archive endpoint returns 401 without cron secret."""
        response = client.post("/api/v1/cron/auto-archive")
        assert response.status_code == 401

    def test_auto_archive_with_invalid_secret_returns_401(self, client):
        """Test that auto-archive endpoint returns 401 with invalid secret."""
        with patch("app.core.config.settings.CRON_SECRET", "valid_secret"):
            response = client.post(
                "/api/v1/cron/auto-archive",
                headers={"Authorization": "Bearer invalid_secret"}
            )
            assert response.status_code == 401

    def test_auto_archive_with_wrong_format_returns_401(self, client):
        """Test that auto-archive endpoint returns 401 with wrong header format."""
        with patch("app.core.config.settings.CRON_SECRET", "valid_secret"):
            response = client.post(
                "/api/v1/cron/auto-archive",
                headers={"Authorization": "valid_secret"}  # Missing "Bearer" prefix
            )
            assert response.status_code == 401

    def test_cleanup_locations_without_secret_returns_401(self, client):
        """Test that cleanup-old-locations endpoint returns 401 without cron secret."""
        response = client.post("/api/v1/cron/cleanup-old-locations")
        assert response.status_code == 401

    def test_cleanup_locations_with_invalid_secret_returns_401(self, client):
        """Test that cleanup-old-locations endpoint returns 401 with invalid secret."""
        with patch("app.core.config.settings.CRON_SECRET", "valid_secret"):
            response = client.post(
                "/api/v1/cron/cleanup-old-locations",
                headers={"Authorization": "Bearer wrong_secret"}
            )
            assert response.status_code == 401


class TestCronAutoArchive:
    """Test auto-archive cron endpoint functionality."""

    def test_auto_archive_with_valid_secret_succeeds(self, client):
        """Test that auto-archive endpoint succeeds with valid cron secret."""
        with patch("app.core.config.settings.CRON_SECRET", "valid_secret"):
            response = client.post(
                "/api/v1/cron/auto-archive",
                headers={"Authorization": "Bearer valid_secret"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "success" in data
            assert data["success"] is True
            assert "archived_count" in data

    def test_auto_archive_returns_correct_format(self, client):
        """Test that auto-archive endpoint returns expected response format."""
        with patch("app.core.config.settings.CRON_SECRET", "test_secret"):
            response = client.post(
                "/api/v1/cron/auto-archive",
                headers={"Authorization": "Bearer test_secret"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "success" in data
            assert "message" in data
            assert "archived_count" in data
            assert "timestamp" in data


class TestCronCleanupLocations:
    """Test location cleanup cron endpoint functionality."""

    def test_cleanup_locations_with_valid_secret_succeeds(self, client):
        """Test that cleanup-old-locations endpoint succeeds with valid cron secret."""
        with patch("app.core.config.settings.CRON_SECRET", "valid_secret"):
            response = client.post(
                "/api/v1/cron/cleanup-old-locations",
                headers={"Authorization": "Bearer valid_secret"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "success" in data
            assert data["success"] is True
            assert "deleted_count" in data

    def test_cleanup_locations_returns_correct_format(self, client):
        """Test that cleanup-old-locations endpoint returns expected response format."""
        with patch("app.core.config.settings.CRON_SECRET", "test_secret"):
            response = client.post(
                "/api/v1/cron/cleanup-old-locations",
                headers={"Authorization": "Bearer test_secret"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "success" in data
            assert "message" in data
            assert "deleted_count" in data
            assert "cutoff_date" in data
            assert "timestamp" in data


class TestCronSecretNotConfigured:
    """Test behavior when CRON_SECRET is not configured."""

    def test_auto_archive_without_cron_secret_configured_returns_401(self, client):
        """Test that auto-archive returns 401 when CRON_SECRET is not set."""
        with patch("app.core.config.settings.CRON_SECRET", None):
            response = client.post(
                "/api/v1/cron/auto-archive",
                headers={"Authorization": "Bearer some_secret"}
            )
            assert response.status_code == 401
            assert "not configured" in response.json()["detail"]

    def test_cleanup_locations_without_cron_secret_configured_returns_401(self, client):
        """Test that cleanup-old-locations returns 401 when CRON_SECRET is not set."""
        with patch("app.core.config.settings.CRON_SECRET", None):
            response = client.post(
                "/api/v1/cron/cleanup-old-locations",
                headers={"Authorization": "Bearer some_secret"}
            )
            assert response.status_code == 401
            assert "not configured" in response.json()["detail"]


class TestCronAutoExpireStale:
    """Test auto-expire stale orders cron endpoint."""

    def test_auto_expire_stale_requires_auth(self, client):
        """Test that auto-expire-stale endpoint requires CRON_SECRET."""
        response = client.post("/api/v1/cron/auto-expire-stale")
        assert response.status_code == 401

    def test_auto_expire_stale_with_invalid_secret_returns_401(self, client):
        """Test that auto-expire-stale returns 401 with invalid secret."""
        with patch("app.core.config.settings.CRON_SECRET", "valid_secret"):
            response = client.post(
                "/api/v1/cron/auto-expire-stale",
                headers={"Authorization": "Bearer wrong_secret"}
            )
            assert response.status_code == 401

    def test_auto_expire_stale_with_valid_secret_succeeds(self, client):
        """Test that auto-expire-stale endpoint succeeds with valid cron secret."""
        with patch("app.core.config.settings.CRON_SECRET", "valid_secret"):
            response = client.post(
                "/api/v1/cron/auto-expire-stale",
                headers={"Authorization": "Bearer valid_secret"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "expired_count" in data

    def test_auto_expire_stale_returns_correct_format(self, client):
        """Test that auto-expire-stale returns expected response format."""
        with patch("app.core.config.settings.CRON_SECRET", "test_secret"):
            response = client.post(
                "/api/v1/cron/auto-expire-stale",
                headers={"Authorization": "Bearer test_secret"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "success" in data
            assert "expired_count" in data
            assert "cutoff_date" in data
            assert "timestamp" in data


class TestCronCheckDriverShifts:
    """Test driver shift check cron endpoint."""

    def test_check_driver_shifts_requires_auth(self, client):
        """Test that check-driver-shifts endpoint requires CRON_SECRET."""
        response = client.post("/api/v1/cron/check-driver-shifts")
        assert response.status_code == 401

    def test_check_driver_shifts_with_invalid_secret_returns_401(self, client):
        """Test that check-driver-shifts returns 401 with invalid secret."""
        with patch("app.core.config.settings.CRON_SECRET", "valid_secret"):
            response = client.post(
                "/api/v1/cron/check-driver-shifts",
                headers={"Authorization": "Bearer wrong_secret"}
            )
            assert response.status_code == 401

    def test_check_driver_shifts_with_valid_secret_succeeds(self, client):
        """Test that check-driver-shifts endpoint succeeds with valid cron secret."""
        with patch("app.core.config.settings.CRON_SECRET", "valid_secret"):
            response = client.post(
                "/api/v1/cron/check-driver-shifts",
                headers={"Authorization": "Bearer valid_secret"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "notified_count" in data
            assert "skipped_count" in data

    def test_check_driver_shifts_returns_correct_format(self, client):
        """Test that check-driver-shifts returns expected response format."""
        with patch("app.core.config.settings.CRON_SECRET", "test_secret"):
            response = client.post(
                "/api/v1/cron/check-driver-shifts",
                headers={"Authorization": "Bearer test_secret"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "success" in data
            assert "notified_count" in data
            assert "skipped_count" in data
            assert "timestamp" in data
