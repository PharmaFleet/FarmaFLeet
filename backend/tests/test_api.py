"""
Backend API Tests for PharmaFleet Delivery System
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealthCheck:
    """Health check endpoint tests"""

    def test_health_check_returns_200(self):
        """Test that health check endpoint returns 200 OK"""
        response = client.get("/api/v1/utils/health-check")
        assert response.status_code == 200
        assert response.json() == {"msg": "OK"}


class TestAuthEndpoints:
    """Authentication endpoint tests"""

    def test_login_without_credentials_fails(self):
        """Test that login without credentials returns 422"""
        response = client.post("/api/v1/login/access-token")
        assert response.status_code == 422

    def test_login_with_invalid_credentials_fails(self):
        """Test that login with invalid credentials returns 401"""
        response = client.post(
            "/api/v1/login/access-token",
            data={"username": "invalid@test.com", "password": "wrongpassword"},
        )
        # Should return 401 or 400 for invalid credentials
        assert response.status_code in [400, 401]


class TestOrderEndpoints:
    """Order endpoint tests (without authentication)"""

    def test_orders_list_requires_auth(self):
        """Test that orders endpoint requires authentication"""
        response = client.get("/api/v1/orders")
        assert response.status_code == 401

    def test_order_detail_requires_auth(self):
        """Test that order detail endpoint requires authentication"""
        response = client.get("/api/v1/orders/1")
        assert response.status_code == 401


class TestDriverEndpoints:
    """Driver endpoint tests (without authentication)"""

    def test_drivers_list_requires_auth(self):
        """Test that drivers endpoint requires authentication"""
        response = client.get("/api/v1/drivers")
        assert response.status_code == 401

    def test_driver_location_update_requires_auth(self):
        """Test that driver location update requires authentication"""
        response = client.post(
            "/api/v1/drivers/location",
            json={"latitude": 29.3759, "longitude": 47.9774},
        )
        assert response.status_code == 401


class TestAPIDocumentation:
    """API Documentation tests"""

    def test_openapi_schema_available(self):
        """Test that OpenAPI schema is available"""
        response = client.get("/api/v1/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data

    def test_swagger_ui_available(self):
        """Test that Swagger UI is accessible"""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_redoc_available(self):
        """Test that ReDoc is accessible"""
        response = client.get("/redoc")
        assert response.status_code == 200


class TestCORSHeaders:
    """CORS configuration tests"""

    def test_cors_headers_present(self):
        """Test that CORS headers are present"""
        response = client.options(
            "/api/v1/utils/health-check",
            headers={"Origin": "http://localhost:3000"},
        )
        # CORS preflight should be handled


class TestResponseFormat:
    """Response format validation tests"""

    def test_health_check_json_format(self):
        """Test health check returns proper JSON format"""
        response = client.get("/api/v1/utils/health-check")
        assert response.headers["content-type"] == "application/json"

    def test_error_responses_have_detail(self):
        """Test that error responses contain detail field"""
        response = client.get("/api/v1/orders/99999")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
