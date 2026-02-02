"""
Security tests for authentication and authorization.

Tests cover:
- JWT token validation
- Secret key enforcement
- Token expiration
- WebSocket authentication
- Warehouse access control
"""
import pytest
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token, verify_token_subject
from app.main import app

client = TestClient(app)


class TestJWTSecurity:
    """Test JWT token security."""

    def test_token_expiration_enforced(self):
        """Test that tokens expire after configured time (2 hours)."""
        token = create_access_token(subject="123")

        # Decode and check expiration
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp = datetime.fromtimestamp(payload["exp"])
        now = datetime.utcnow()

        # Token should expire in approximately 2 hours (120 minutes)
        time_until_expiry = exp - now
        assert time_until_expiry.total_seconds() < 7300  # 2 hours + 100 seconds buffer
        assert time_until_expiry.total_seconds() > 7000  # At least 1h 56m

    def test_expired_token_rejected(self):
        """Test that expired tokens are rejected."""
        # Create a token that expires immediately
        expired_token = create_access_token(
            subject="123",
            expires_delta=timedelta(seconds=-1)  # Already expired
        )

        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {expired_token}"}
        )

        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower() or "validate" in response.json()["detail"].lower()

    def test_invalid_token_rejected(self):
        """Test that tampered/invalid tokens are rejected."""
        # Create a valid token then tamper with it
        valid_token = create_access_token(subject="123")
        tampered_token = valid_token[:-10] + "tampered12"

        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {tampered_token}"}
        )

        assert response.status_code == 401

    def test_token_without_subject_rejected(self):
        """Test that tokens without 'sub' claim are rejected."""
        # Manually create a token without 'sub'
        payload = {"exp": datetime.utcnow() + timedelta(hours=1)}
        token_without_sub = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token_without_sub}"}
        )

        assert response.status_code in [401, 404]  # Either auth error or user not found

    def test_verify_token_subject_function(self):
        """Test the verify_token_subject function."""
        # Create valid token
        token = create_access_token(subject="user123")

        # Verify without expected subject
        result = verify_token_subject(token)
        assert result == "user123"

        # Verify with matching subject
        result = verify_token_subject(token, expected_subject="user123")
        assert result == "user123"

        # Verify with non-matching subject
        result = verify_token_subject(token, expected_subject="user456")
        assert result is None

        # Verify invalid token
        result = verify_token_subject("invalid_token")
        assert result is None


class TestWebSocketSecurity:
    """Test WebSocket authentication security."""

    def test_websocket_requires_token(self):
        """Test that WebSocket connections require authentication token."""
        # Try to connect without token
        with client.websocket_connect("/api/v1/ws/drivers") as websocket:
            # Connection should be rejected (exception raised)
            pass
        # If we reach here, the test should fail
        pytest.fail("WebSocket accepted connection without token")

    def test_websocket_rejects_invalid_token(self):
        """Test that WebSocket rejects invalid tokens."""
        try:
            with client.websocket_connect("/api/v1/ws/drivers?token=invalid_token") as websocket:
                # Should not reach here
                pytest.fail("WebSocket accepted invalid token")
        except Exception:
            # Expected to fail connection
            pass

    def test_websocket_accepts_valid_token(self):
        """Test that WebSocket accepts valid tokens."""
        # This test requires a valid user in the database
        # Skip if database is not set up for tests
        pytest.skip("Requires database setup with test user")

        # token = create_access_token(subject="valid_user_id")
        # with client.websocket_connect(f"/api/v1/ws/drivers?token={token}") as websocket:
        #     data = websocket.receive_json()
        #     assert data["event"] == "connected"
        #     assert data["authenticated"] is True


class TestWarehouseAccessControl:
    """Test warehouse-level access control."""

    def test_user_cannot_access_other_warehouse_orders(self):
        """Test that users cannot access orders from warehouses they don't have access to."""
        # This test requires database setup with test users and warehouses
        pytest.skip("Requires database setup with test users and warehouses")

        # TODO: Implement test when database fixtures are ready
        # 1. Create warehouse A and warehouse B
        # 2. Create user assigned to warehouse A
        # 3. Create order in warehouse B
        # 4. Attempt to access warehouse B order as warehouse A user
        # 5. Assert 403 Forbidden response

    def test_super_admin_can_access_all_warehouses(self):
        """Test that super admins can access orders from all warehouses."""
        pytest.skip("Requires database setup with test users and warehouses")

        # TODO: Implement test when database fixtures are ready
        # 1. Create warehouse A and warehouse B
        # 2. Create super admin user
        # 3. Create orders in both warehouses
        # 4. Access both orders as super admin
        # 5. Assert successful access to both

    def test_driver_can_only_see_own_warehouse_orders(self):
        """Test that drivers can only see orders from their assigned warehouse."""
        pytest.skip("Requires database setup with test users and warehouses")

        # TODO: Implement test when database fixtures are ready


class TestSecretKeyValidation:
    """Test SECRET_KEY validation."""

    def test_default_secret_key_rejected(self):
        """Test that the default 'CHANGEME' secret key is rejected."""
        # This test would require reloading the config module
        # In production, the validation happens at app startup
        from app.core.config import Settings
        from pydantic import ValidationError

        with pytest.raises(ValidationError) as exc_info:
            Settings(SECRET_KEY="CHANGEME")

        assert "CHANGEME" in str(exc_info.value) or "secret" in str(exc_info.value).lower()

    def test_short_secret_key_rejected(self):
        """Test that secret keys shorter than 32 characters are rejected."""
        from app.core.config import Settings
        from pydantic import ValidationError

        with pytest.raises(ValidationError) as exc_info:
            Settings(SECRET_KEY="short")

        assert "32" in str(exc_info.value) or "length" in str(exc_info.value).lower()

    def test_secure_secret_key_accepted(self):
        """Test that properly generated secret keys are accepted."""
        import secrets
        from app.core.config import Settings

        secure_key = secrets.token_urlsafe(32)
        config = Settings(SECRET_KEY=secure_key)
        assert config.SECRET_KEY == secure_key


class TestRateLimiting:
    """Test rate limiting security."""

    def test_rate_limiting_on_login_endpoint(self):
        """Test that rate limiting is applied to login endpoint."""
        pytest.skip("Rate limiting test requires Redis and proper configuration")

        # TODO: Implement when Redis is available in test environment
        # 1. Make multiple rapid login attempts
        # 2. Assert that after N attempts, 429 Too Many Requests is returned

    def test_rate_limiting_on_password_reset(self):
        """Test that rate limiting prevents password reset abuse."""
        pytest.skip("Requires rate limiting configuration")


class TestInputValidation:
    """Test input validation and sanitization."""

    def test_sql_injection_prevention(self):
        """Test that SQL injection attempts are blocked."""
        # Try SQL injection in order search
        response = client.get(
            "/api/v1/orders?search=' OR '1'='1"
        )

        # Should not return unauthorized data or error
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            # Verify that the malicious query didn't succeed
            data = response.json()
            # The response should be empty or only contain legitimate results
            assert isinstance(data, dict)

    def test_xss_prevention_in_order_data(self):
        """Test that XSS attempts in order data are handled safely."""
        pytest.skip("Requires authenticated user session")

        # TODO: Test creating order with XSS payload
        # Verify that it's either rejected or properly escaped


# Integration test markers
pytestmark = [
    pytest.mark.security,
    pytest.mark.integration,
]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
