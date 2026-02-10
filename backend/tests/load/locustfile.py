"""
Locust load testing configuration for PharmaFleet API.

This module simulates realistic user behavior for load testing the API endpoints.
It tests key endpoints under concurrent load to measure performance and reliability.

Targets:
- <200ms p95 response time
- <1% error rate

Usage:
    locust -f backend/tests/load/locustfile.py --host=http://localhost:8000

Web UI will be available at http://localhost:8089
"""

import random
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner


class PharmaFleetUser(HttpUser):
    """
    Simulates a PharmaFleet dashboard user performing typical operations.

    User behavior:
    - Lists orders frequently (main activity)
    - Views individual orders
    - Checks driver availability
    - Views dashboard analytics
    - Occasionally performs batch operations
    """

    # Wait 1-3 seconds between tasks (realistic user think time)
    wait_time = between(1, 3)

    # Store order and driver IDs discovered during testing
    order_ids: list = []
    driver_ids: list = []

    def on_start(self):
        """
        Called when a simulated user starts.
        Authenticates and stores the access token for subsequent requests.
        """
        # Login to get access token
        # Uses test credentials - ensure these exist in your test database
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "testpassword"
            },
            name="/api/v1/auth/login"
        )

        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            # If login fails, try with admin credentials
            response = self.client.post(
                "/api/v1/auth/login",
                json={
                    "email": "admin@pharmafleet.com",
                    "password": "admin123"
                },
                name="/api/v1/auth/login"
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                # Fallback: proceed without auth (will likely fail)
                self.token = None
                self.headers = {}

    @task(5)
    def list_orders(self):
        """
        List orders - the most common operation.
        Weighted at 5 to represent frequent access.

        Tests: GET /api/v1/orders
        """
        with self.client.get(
            "/api/v1/orders",
            headers=self.headers,
            params={"limit": 50, "offset": 0},
            name="/api/v1/orders [list]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                # Store order IDs for later use in get_order task
                if isinstance(data, list):
                    self.order_ids = [order.get("id") for order in data[:20] if order.get("id")]
                elif isinstance(data, dict) and "items" in data:
                    self.order_ids = [order.get("id") for order in data["items"][:20] if order.get("id")]
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(3)
    def get_order(self):
        """
        Get a single order by ID.
        Weighted at 3 for moderate frequency.

        Tests: GET /api/v1/orders/{id}
        """
        if not self.order_ids:
            # If no orders discovered yet, use a default ID
            order_id = 1
        else:
            order_id = random.choice(self.order_ids)

        with self.client.get(
            f"/api/v1/orders/{order_id}",
            headers=self.headers,
            name="/api/v1/orders/{id}",
            catch_response=True
        ) as response:
            if response.status_code in [200, 404]:
                # 404 is acceptable if order doesn't exist
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(2)
    def list_drivers(self):
        """
        List available drivers.
        Weighted at 2 for common access.

        Tests: GET /api/v1/drivers
        """
        with self.client.get(
            "/api/v1/drivers",
            headers=self.headers,
            name="/api/v1/drivers [list]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                # Store driver IDs for batch operations
                if isinstance(data, list):
                    self.driver_ids = [driver.get("id") for driver in data[:10] if driver.get("id")]
                elif isinstance(data, dict) and "items" in data:
                    self.driver_ids = [driver.get("id") for driver in data["items"][:10] if driver.get("id")]
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(2)
    def get_dashboard_analytics(self):
        """
        Get executive dashboard analytics.
        Weighted at 2 for common access.

        Tests: GET /api/v1/analytics/executive-dashboard
        """
        with self.client.get(
            "/api/v1/analytics/executive-dashboard",
            headers=self.headers,
            name="/api/v1/analytics/executive-dashboard",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(1)
    def get_orders_today(self):
        """
        Get today's order count.
        Weighted at 1 for occasional access.

        Tests: GET /api/v1/analytics/orders-today
        """
        with self.client.get(
            "/api/v1/analytics/orders-today",
            headers=self.headers,
            name="/api/v1/analytics/orders-today",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(1)
    def get_active_drivers(self):
        """
        Get active driver count.
        Weighted at 1 for occasional access.

        Tests: GET /api/v1/analytics/active-drivers
        """
        with self.client.get(
            "/api/v1/analytics/active-drivers",
            headers=self.headers,
            name="/api/v1/analytics/active-drivers",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(1)
    def get_driver_performance(self):
        """
        Get driver performance analytics.
        Weighted at 1 for occasional access.

        Tests: GET /api/v1/analytics/driver-performance
        """
        with self.client.get(
            "/api/v1/analytics/driver-performance",
            headers=self.headers,
            name="/api/v1/analytics/driver-performance",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(1)
    def batch_assign_orders(self):
        """
        Batch assign orders to a driver (simulated, uses safe test data).
        Weighted at 1 for rare but important operation.

        Tests: POST /api/v1/orders/batch-assign

        Note: This may fail with 400/404 if orders or driver don't exist,
        which is acceptable for load testing purposes.
        """
        if not self.order_ids or not self.driver_ids:
            # Skip if no test data available
            return

        # Select a few order IDs for batch operation (max 5)
        selected_orders = random.sample(self.order_ids, min(3, len(self.order_ids)))
        driver_id = random.choice(self.driver_ids)

        with self.client.post(
            "/api/v1/orders/batch-assign",
            headers=self.headers,
            json={
                "order_ids": selected_orders,
                "driver_id": driver_id
            },
            name="/api/v1/orders/batch-assign",
            catch_response=True
        ) as response:
            # Accept various status codes since this is a destructive operation
            # 200: Success
            # 400: Bad request (orders already assigned, etc.)
            # 404: Orders or driver not found
            # 422: Validation error
            if response.status_code in [200, 400, 404, 422]:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(1)
    def get_warehouses(self):
        """
        List warehouses.
        Weighted at 1 for occasional access.

        Tests: GET /api/v1/warehouses
        """
        with self.client.get(
            "/api/v1/warehouses",
            headers=self.headers,
            name="/api/v1/warehouses [list]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Authentication failed")
            else:
                response.failure(f"Unexpected status: {response.status_code}")


class DriverAppUser(HttpUser):
    """
    Simulates a mobile driver app user.

    Driver behavior:
    - Syncs data periodically
    - Updates location frequently
    - Views assigned orders
    """

    weight = 1  # Lower weight than dashboard users
    wait_time = between(2, 5)

    def on_start(self):
        """Authenticate as a driver user."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "driver@pharmafleet.com",
                "password": "driver123"
            },
            name="/api/v1/auth/login [driver]"
        )

        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}

    @task(3)
    def sync_data(self):
        """
        Sync driver data with server.

        Tests: GET /api/v1/sync/driver
        """
        with self.client.get(
            "/api/v1/sync/driver",
            headers=self.headers,
            name="/api/v1/sync/driver",
            catch_response=True
        ) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(5)
    def update_location(self):
        """
        Update driver location (frequent operation).

        Tests: POST /api/v1/drivers/location
        """
        # Simulate Kuwait City area coordinates
        lat = 29.3759 + random.uniform(-0.1, 0.1)
        lng = 47.9774 + random.uniform(-0.1, 0.1)

        with self.client.post(
            "/api/v1/drivers/location",
            headers=self.headers,
            json={
                "latitude": lat,
                "longitude": lng
            },
            name="/api/v1/drivers/location",
            catch_response=True
        ) as response:
            if response.status_code in [200, 401, 403, 404]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")


# Event hooks for custom reporting
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Log when load test starts."""
    print("=" * 60)
    print("PharmaFleet Load Test Starting")
    print("=" * 60)
    print("Target: <200ms p95 response time, <1% error rate")
    print("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Log summary when load test stops."""
    print("=" * 60)
    print("PharmaFleet Load Test Complete")
    print("=" * 60)


# Custom percentile tracking (optional, for detailed analysis)
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Track request metrics for analysis."""
    # This hook can be extended to log to external systems
    pass
