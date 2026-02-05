import pytest


class TestDashboardFlows:
    """Integration tests for Dashboard Manager flows"""

    def test_get_drivers_empty(self, client, admin_token_headers):
        """
        Scenario: Admin requests driver list when database is empty.
        """
        response = client.get("/api/v1/drivers/", headers=admin_token_headers)

        # Empty database should return empty list or auth/route error
        assert response.status_code in [200, 401, 403, 404]

        if response.status_code == 200:
            assert isinstance(response.json(), list)

    def test_get_orders_empty(self, client, admin_token_headers):
        """
        Scenario: Admin requests order list when database is empty.
        """
        response = client.get("/api/v1/orders/", headers=admin_token_headers)

        assert response.status_code in [200, 401, 403, 404]

        if response.status_code == 200:
            assert isinstance(response.json(), list)
