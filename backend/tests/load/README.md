# PharmaFleet Load Testing

This directory contains Locust load testing configuration for the PharmaFleet API.

## Overview

The load tests simulate realistic user behavior for:
- **Dashboard Users**: Browsing orders, viewing analytics, assigning drivers
- **Driver App Users**: Syncing data, updating location

### Performance Targets

| Metric | Target |
|--------|--------|
| p95 Response Time | < 200ms |
| Error Rate | < 1% |
| Concurrent Users | 100+ |

## Prerequisites

### 1. Install Locust

```bash
pip install locust
```

Or add to your virtual environment:

```bash
cd backend
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
pip install locust
```

### 2. Prepare Test Database

Ensure you have test users in your database:

```sql
-- Admin user for dashboard testing
INSERT INTO users (email, hashed_password, role, full_name, is_active)
VALUES ('test@example.com', '<hashed_password>', 'super_admin', 'Test Admin', true);

-- Driver user for mobile app testing
INSERT INTO users (email, hashed_password, role, full_name, is_active)
VALUES ('driver@pharmafleet.com', '<hashed_password>', 'driver', 'Test Driver', true);
```

Or use the seeding scripts:

```bash
cd backend
python scripts/seed_superadmin.py
```

### 3. Start the API Server

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or using Docker:

```bash
docker compose up -d
```

## Running Load Tests

### Web UI Mode (Recommended)

Start Locust with the web interface:

```bash
cd backend
locust -f tests/load/locustfile.py --host=http://localhost:8000
```

Then open http://localhost:8089 in your browser.

Configure the test:
- **Number of users**: Start with 10, scale up to 100
- **Spawn rate**: 5-10 users per second
- **Host**: http://localhost:8000 (or your target server)

### Headless Mode

Run without the web interface (for CI/CD):

```bash
# Run with 100 users, spawning 10 per second, for 5 minutes
locust -f tests/load/locustfile.py \
    --host=http://localhost:8000 \
    --users 100 \
    --spawn-rate 10 \
    --run-time 5m \
    --headless \
    --csv=results/load_test
```

### Testing Against Production

> **Warning**: Only run load tests against production during maintenance windows!

```bash
locust -f tests/load/locustfile.py \
    --host=https://pharmafleet-olive.vercel.app \
    --users 50 \
    --spawn-rate 5 \
    --run-time 2m \
    --headless
```

## Test Scenarios

### PharmaFleetUser (Dashboard)

| Endpoint | Weight | Description |
|----------|--------|-------------|
| GET /orders | 5 | List orders (most common) |
| GET /orders/{id} | 3 | View single order |
| GET /drivers | 2 | List drivers |
| GET /analytics/executive-dashboard | 2 | Dashboard stats |
| GET /analytics/orders-today | 1 | Today's order count |
| GET /analytics/active-drivers | 1 | Active driver count |
| GET /analytics/driver-performance | 1 | Driver metrics |
| POST /orders/batch-assign | 1 | Batch assignment |
| GET /warehouses | 1 | List warehouses |

### DriverAppUser (Mobile)

| Endpoint | Weight | Description |
|----------|--------|-------------|
| POST /drivers/location | 5 | Update location |
| GET /sync/driver | 3 | Sync driver data |

## Interpreting Results

### Web UI Metrics

- **Requests/s**: Current throughput
- **Failures/s**: Error rate
- **Median/95%**: Response time percentiles
- **Current Users**: Active simulated users

### CSV Reports

When using `--csv=results/load_test`, three files are generated:

1. `load_test_stats.csv` - Aggregate statistics per endpoint
2. `load_test_stats_history.csv` - Time-series data
3. `load_test_failures.csv` - Failure details

### Key Metrics to Monitor

1. **p95 Response Time**: Should stay under 200ms
2. **Error Rate**: Should be under 1%
3. **Requests/s**: Baseline throughput
4. **Response Time Trend**: Should remain stable as users increase

## Troubleshooting

### Authentication Failures

If you see many 401 errors:

1. Verify test users exist in the database
2. Check that passwords match the test credentials
3. Ensure the SECRET_KEY matches between login and token validation

### Connection Errors

If Locust can't connect:

1. Verify the API server is running
2. Check the host URL (including protocol and port)
3. Ensure no firewall is blocking connections

### High Error Rates

If error rate exceeds 1%:

1. Check server logs for errors
2. Verify database connections are healthy
3. Monitor Redis connection pool
4. Check for rate limiting (default: 1000 req/min)

## Customization

### Adjusting User Behavior

Modify the `wait_time` to change think time:

```python
wait_time = between(0.5, 1)  # More aggressive
wait_time = between(2, 5)    # More realistic
```

### Changing Task Weights

Increase weight for endpoints you want to stress more:

```python
@task(10)  # Run 10x more often
def list_orders(self):
    ...
```

### Adding New Endpoints

```python
@task(1)
def new_endpoint(self):
    with self.client.get(
        "/api/v1/new-endpoint",
        headers=self.headers,
        name="/api/v1/new-endpoint",
        catch_response=True
    ) as response:
        if response.status_code == 200:
            response.success()
        else:
            response.failure(f"Status: {response.status_code}")
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Load Tests
on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2am

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: docker compose up -d

      - name: Wait for API
        run: sleep 30

      - name: Run load tests
        run: |
          pip install locust
          locust -f backend/tests/load/locustfile.py \
            --host=http://localhost:8000 \
            --users 50 \
            --spawn-rate 5 \
            --run-time 2m \
            --headless \
            --csv=results/load_test

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: results/
```

## Further Reading

- [Locust Documentation](https://docs.locust.io/)
- [Writing Locust Tests](https://docs.locust.io/en/stable/writing-a-locustfile.html)
- [Running Distributed Tests](https://docs.locust.io/en/stable/running-distributed.html)
