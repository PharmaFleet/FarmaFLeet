"""
Tests for FCM token registration and notification service.

These tests verify:
1. FCM token registration endpoint works correctly
2. Topic subscription methods work correctly
3. Broadcast notification methods work correctly
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.api.deps import get_db
from app.models.user import User, UserRole
from app.models.driver import Driver
from app.core.security import create_access_token


class TestFCMTokenRegistration:
    """Test FCM token registration endpoint."""

    def test_fcm_token_registration_without_auth_returns_401(self, client):
        """Test that FCM token registration requires authentication."""
        response = client.post(
            "/api/v1/auth/fcm-token",
            json={"token": "test_fcm_token_12345"}
        )
        assert response.status_code == 401

    def test_fcm_token_registration_with_auth_succeeds(self, client, admin_token_headers):
        """Test that FCM token registration succeeds with valid auth."""
        # Mock the user and database
        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.role = UserRole.SUPER_ADMIN
        mock_user.is_active = True
        mock_user.fcm_token = None

        mock_session = MagicMock()
        mock_session.execute = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.add = MagicMock()

        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_user
        mock_session.execute.return_value = mock_result

        async def override_get_db():
            yield mock_session

        app.dependency_overrides[get_db] = override_get_db

        # Mock the auth service to not check blacklist
        with patch("app.services.auth.auth_service.is_token_blacklisted", AsyncMock(return_value=False)):
            response = client.post(
                "/api/v1/auth/fcm-token",
                json={"token": "test_fcm_token_12345"},
                headers=admin_token_headers
            )

        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["msg"] == "FCM token registered successfully"

    def test_fcm_token_registration_for_driver_subscribes_to_warehouse_topic(self, client):
        """Test that driver FCM token registration also subscribes to warehouse topic."""
        # Create driver token
        driver_token = create_access_token(subject="2")
        driver_headers = {"Authorization": f"Bearer {driver_token}"}

        # Mock driver user
        mock_driver_user = MagicMock(spec=User)
        mock_driver_user.id = 2
        mock_driver_user.role = UserRole.DRIVER
        mock_driver_user.is_active = True
        mock_driver_user.fcm_token = None

        # Mock driver record
        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = 1
        mock_driver.user_id = 2
        mock_driver.warehouse_id = 5

        mock_session = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session.add = MagicMock()

        # First call returns driver user, second call returns driver record
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = mock_driver_user

        mock_driver_result = MagicMock()
        mock_driver_result.scalars.return_value.first.return_value = mock_driver

        mock_session.execute = AsyncMock(side_effect=[mock_user_result, mock_driver_result])

        async def override_get_db():
            yield mock_session

        app.dependency_overrides[get_db] = override_get_db

        with patch("app.services.auth.auth_service.is_token_blacklisted", AsyncMock(return_value=False)):
            with patch("app.services.notification.notification_service.subscribe_to_warehouse_topic", AsyncMock(return_value=True)) as mock_subscribe:
                response = client.post(
                    "/api/v1/auth/fcm-token",
                    json={"token": "driver_fcm_token_12345"},
                    headers=driver_headers
                )

                # Verify subscription was attempted
                mock_subscribe.assert_called_once_with("driver_fcm_token_12345", 5)

        app.dependency_overrides.clear()

        assert response.status_code == 200


class TestNotificationServiceTopics:
    """Test notification service topic methods."""

    @pytest.mark.asyncio
    async def test_subscribe_to_warehouse_topic_mock_mode(self):
        """Test topic subscription in mock mode (no Firebase)."""
        from app.services.notification import NotificationService

        with patch("firebase_admin._apps", {}):
            service = NotificationService()
            result = await service.subscribe_to_warehouse_topic("test_token", 1)
            assert result is True

    @pytest.mark.asyncio
    async def test_unsubscribe_from_warehouse_topic_mock_mode(self):
        """Test topic unsubscription in mock mode (no Firebase)."""
        from app.services.notification import NotificationService

        with patch("firebase_admin._apps", {}):
            service = NotificationService()
            result = await service.unsubscribe_from_warehouse_topic("test_token", 1)
            assert result is True

    @pytest.mark.asyncio
    async def test_broadcast_to_warehouse_mock_mode(self):
        """Test warehouse broadcast in mock mode (no Firebase)."""
        from app.services.notification import NotificationService

        with patch("firebase_admin._apps", {}):
            service = NotificationService()
            result = await service.broadcast_to_warehouse(
                warehouse_id=1,
                title="Test Title",
                body="Test Body"
            )
            assert result == "mock-message-id"

    @pytest.mark.asyncio
    async def test_broadcast_new_orders_to_warehouse_mock_mode(self):
        """Test new orders broadcast in mock mode (no Firebase)."""
        from app.services.notification import NotificationService

        with patch("firebase_admin._apps", {}):
            service = NotificationService()
            result = await service.broadcast_new_orders_to_warehouse(
                warehouse_id=1,
                count=5
            )
            assert result == "mock-message-id"


class TestNotificationServiceWithFirebase:
    """Test notification service with Firebase initialized."""

    @pytest.mark.asyncio
    async def test_subscribe_to_warehouse_topic_with_firebase(self):
        """Test topic subscription with Firebase initialized."""
        from app.services.notification import NotificationService

        mock_response = MagicMock()
        mock_response.success_count = 1
        mock_response.errors = []

        with patch("firebase_admin._apps", {"default": MagicMock()}):
            with patch("firebase_admin.messaging.subscribe_to_topic", return_value=mock_response):
                service = NotificationService()
                result = await service.subscribe_to_warehouse_topic("test_token", 1)
                assert result is True

    @pytest.mark.asyncio
    async def test_subscribe_to_warehouse_topic_failure(self):
        """Test topic subscription failure handling."""
        from app.services.notification import NotificationService

        mock_response = MagicMock()
        mock_response.success_count = 0
        mock_response.errors = ["Test error"]

        with patch("firebase_admin._apps", {"default": MagicMock()}):
            with patch("firebase_admin.messaging.subscribe_to_topic", return_value=mock_response):
                service = NotificationService()
                result = await service.subscribe_to_warehouse_topic("test_token", 1)
                assert result is False

    @pytest.mark.asyncio
    async def test_subscribe_to_warehouse_topic_exception(self):
        """Test topic subscription exception handling."""
        from app.services.notification import NotificationService

        with patch("firebase_admin._apps", {"default": MagicMock()}):
            with patch("firebase_admin.messaging.subscribe_to_topic", side_effect=Exception("Test error")):
                service = NotificationService()
                result = await service.subscribe_to_warehouse_topic("test_token", 1)
                assert result is False
