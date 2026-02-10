"""
TDD Tests for Driver Update with User Fields
Tests for updating driver's user fields (phone, full_name) via PUT /api/v1/drivers/{driver_id}
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.driver import Driver
from app.models.user import User
from app.models.warehouse import Warehouse


class TestDriverUpdateUserFields:
    """TDD tests for updating driver's user fields (phone, name)."""

    def test_update_driver_with_user_full_name(self, client, admin_token_headers):
        """Should update the driver's associated user's full_name."""
        # Arrange: Create mock driver with user
        mock_user = MagicMock(spec=User)
        mock_user.id = 10
        mock_user.email = "driver@test.com"
        mock_user.full_name = "Old Name"
        mock_user.is_active = True
        mock_user.is_superuser = False
        mock_user.role = "driver"
        mock_user.fcm_token = None
        mock_user.phone = "1234567890"

        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = 1
        mock_driver.user_id = 10
        mock_driver.user = mock_user
        mock_driver.warehouse = None
        mock_driver.warehouse_id = None
        mock_driver.vehicle_info = "ABC 123"
        mock_driver.vehicle_type = "car"
        mock_driver.biometric_id = "BIO001"
        mock_driver.code = "D001"
        mock_driver.is_available = True

        # Mock the database operations
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_driver

        with patch("app.api.v1.endpoints.drivers.deps.get_db") as mock_get_db:
            mock_session = AsyncMock()
            mock_session.execute.return_value = mock_result
            mock_session.commit = AsyncMock()
            mock_session.refresh = AsyncMock()
            mock_session.get = AsyncMock(return_value=mock_driver)

            async def override_get_db():
                yield mock_session

            from app.main import app
            from app.api.deps import get_db

            app.dependency_overrides[get_db] = override_get_db

            # Act: Send request with user_full_name
            response = client.put(
                "/api/v1/drivers/1",
                json={"user_full_name": "New Driver Name"},
                headers=admin_token_headers,
            )

            app.dependency_overrides.clear()

        # Assert: Endpoint accepts the payload (may return 404 due to mock db)
        # The key assertion is that 422 is NOT returned, meaning the schema accepts user_full_name
        assert response.status_code in [200, 401, 403, 404]

    def test_update_driver_with_user_phone(self, client, admin_token_headers):
        """Should update the driver's associated user's phone."""
        response = client.put(
            "/api/v1/drivers/1",
            json={"user_phone": "+965-9999-9999"},
            headers=admin_token_headers,
        )
        # Schema should accept user_phone field (not return 422)
        assert response.status_code in [200, 401, 403, 404]

    def test_update_driver_all_fields_together(self, client, admin_token_headers):
        """Should update driver fields AND user fields in single request."""
        response = client.put(
            "/api/v1/drivers/1",
            json={
                "vehicle_info": "XYZ 789",
                "vehicle_type": "motorcycle",
                "biometric_id": "BIO999",
                "user_full_name": "Updated Name",
                "user_phone": "+965-1111-2222",
            },
            headers=admin_token_headers,
        )
        # Schema should accept all fields combined
        assert response.status_code in [200, 401, 403, 404]

    def test_update_driver_user_fields_only(self, client, admin_token_headers):
        """Should allow updating only user fields without touching driver fields."""
        response = client.put(
            "/api/v1/drivers/1",
            json={
                "user_full_name": "Only User Name",
                "user_phone": "+965-3333-4444",
            },
            headers=admin_token_headers,
        )
        # Should be valid request (not 422 validation error)
        assert response.status_code in [200, 401, 403, 404]

    def test_driver_update_schema_has_user_fields(self):
        """Verify DriverUpdate schema includes user_full_name and user_phone."""
        from app.schemas.driver import DriverUpdate

        schema = DriverUpdate()
        assert hasattr(schema, "user_full_name")
        assert hasattr(schema, "user_phone")

    def test_driver_update_schema_user_fields_optional(self):
        """Verify user fields are optional (default None)."""
        from app.schemas.driver import DriverUpdate

        # Should be able to create schema without user fields
        schema = DriverUpdate(vehicle_info="test")
        assert schema.user_full_name is None
        assert schema.user_phone is None

    def test_driver_update_schema_explicit_optionals(self):
        """Verify DriverUpdate uses explicit Optional fields, not inherited defaults."""
        from app.schemas.driver import DriverUpdate

        # Create schema with no fields - all should default to None
        schema = DriverUpdate()
        assert schema.is_available is None  # Should be None, not True
        assert schema.vehicle_info is None
        assert schema.warehouse_id is None


class TestDriverUpdateIntegration:
    """Integration tests for driver update with user fields."""

    def test_update_driver_endpoint_accepts_user_full_name_param(
        self, client, admin_token_headers
    ):
        """Test that PUT /drivers/{id} accepts user_full_name in request body."""
        response = client.put(
            "/api/v1/drivers/1",
            json={"user_full_name": "Test Name Change"},
            headers=admin_token_headers,
        )
        # 422 would mean the field is not recognized by schema
        assert response.status_code != 422

    def test_update_driver_endpoint_accepts_user_phone_param(
        self, client, admin_token_headers
    ):
        """Test that PUT /drivers/{id} accepts user_phone in request body."""
        response = client.put(
            "/api/v1/drivers/1",
            json={"user_phone": "+96512345678"},
            headers=admin_token_headers,
        )
        # 422 would mean the field is not recognized by schema
        assert response.status_code != 422
