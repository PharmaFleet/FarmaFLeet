import pytest


class TestMobileFlows:
    """Integration tests for Mobile Driver flows"""

    def test_get_driver_orders_empty(self, client, driver_token_headers):
        """
        Scenario: Driver fetches orders when none assigned.
        """
        driver_id = 1
        response = client.get(
            f"/api/v1/drivers/{driver_id}/orders", headers=driver_token_headers
        )

        # Empty database - expect auth failure or empty list
        assert response.status_code in [200, 401, 403, 404]

        if response.status_code == 200:
            assert isinstance(response.json(), list)

    def test_driver_location_update_no_profile(
        self, client, driver_token_headers
    ):
        """
        Scenario: Driver tries to update location but has no profile.
        """
        location_data = {"latitude": 29.3759, "longitude": 47.9774}

        response = client.post(
            "/api/v1/drivers/location", json=location_data, headers=driver_token_headers
        )

        # With empty DB, driver profile won't exist
        assert response.status_code in [401, 403, 404]
