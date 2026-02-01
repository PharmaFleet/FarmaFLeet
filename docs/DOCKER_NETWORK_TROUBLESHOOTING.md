# Docker Network Troubleshooting Guide for Delivery-System-III

## Quick Start for Network Issues

If you're experiencing `ECONNRESET` or network timeouts during `npm ci` or `npm install` in Docker:

### 1. Use the Updated Dockerfile.dev

The `frontend/Dockerfile.dev` includes network resilience features:
- Increased npm fetch timeouts (60s)
- Automatic retry logic (5 attempts)
- Reduced concurrent connections
- npm install with `--prefer-offline` flag

### 2. Copy and Configure the Override File

```bash
# Copy the example override file
cp docker-compose.override.yml.example docker-compose.override.yml

# Edit the file and uncomment the sections you need
nano docker-compose.override.yml

# Rebuild with the override
docker-compose up --build frontend
```

### 3. Windows-Specific Solutions

#### Option A: Use WSL2 Backend (Recommended)
1. Open Docker Desktop Settings
2. Go to "General" → Check "Use the WSL 2 based engine"
3. Apply & Restart

#### Option B: Increase Docker Resources
1. Docker Desktop → Settings → Resources
2. Increase Memory to at least 4GB
3. Increase Swap to 2GB
4. Apply & Restart

#### Option C: DNS Configuration
Add to `docker-compose.override.yml`:
```yaml
services:
  frontend:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

#### Option D: Use Host Network (Windows 10 Pro/Enterprise only with Hyper-V)
**Note:** Host network mode only works on Linux natively. For Windows with WSL2:
```yaml
services:
  frontend:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### 4. Corporate Proxy Settings

If behind a corporate proxy, add to Dockerfile.dev:
```dockerfile
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV NO_PROXY=$NO_PROXY
```

Build with:
```bash
docker build \
  --build-arg HTTP_PROXY=http://proxy.company.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.company.com:8080 \
  --build-arg NO_PROXY=localhost,127.0.0.1 \
  -f frontend/Dockerfile.dev \
  ./frontend
```

### 5. Use Alternative npm Registry

For users in China or slow connections to npmjs.org:

```dockerfile
# In Dockerfile.dev, change the registry
RUN npm config set registry https://registry.npmmirror.com
```

Or use build args:
```bash
docker build \
  --build-arg NPM_REGISTRY=https://registry.npmmirror.com \
  -f frontend/Dockerfile.dev \
  ./frontend
```

### 6. Pre-download Dependencies (Workaround)

If Docker network is consistently problematic:

```bash
# Download dependencies on host first
cd frontend
npm install

# Then build with volume mount for node_modules
docker-compose up frontend
```

### 7. Clear Docker Cache and Networks

```bash
# Clear build cache
docker builder prune -f

# Clear networks
docker network prune -f

# Restart Docker Desktop (Windows/Mac)
# Or restart Docker service (Linux)
```

### 8. Check Network Connectivity in Container

```bash
# Run a test container
docker run --rm -it node:18-alpine sh

# Inside container, test connectivity
ping registry.npmjs.org
nslookup registry.npmjs.org
wget https://registry.npmjs.org/npm/-/npm-1.0.0.tgz
```

### 9. Use Offline Mode After First Success

Once you have a successful build:
```bash
# Save the node_modules volume
docker-compose stop frontend
docker volume ls | grep node_modules

# Future builds will use cached modules
docker-compose up --build frontend
```

### 10. Debug Mode

To see detailed npm output:
```dockerfile
# In Dockerfile.dev, temporarily change:
RUN npm config set loglevel verbose
# And remove --prefer-offline to see full network activity
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NPM_CONFIG_FETCH_TIMEOUT` | 60000 | npm fetch timeout in ms |
| `NPM_CONFIG_FETCH_RETRIES` | 5 | Number of retry attempts |
| `NPM_CONFIG_MAXSOCKETS` | 5 | Max concurrent connections |
| `NPM_CONFIG_STRICT_SSL` | true | Enforce SSL certificate validation |
| `NODE_OPTIONS` | --max-old-space-size=4096 | Node.js memory limit |

## Files Reference

- `frontend/Dockerfile.dev` - Development Dockerfile with network resilience
- `docker-compose.override.yml.example` - Example configuration for network issues
- `frontend/scripts/npm-install-retry.sh` - Shell script with retry logic

## Still Having Issues?

1. Check Docker Desktop version (update to latest)
2. Disable VPN temporarily to test
3. Try a different network connection
4. Consider using Docker BuildKit with: `DOCKER_BUILDKIT=1 docker-compose build`
