#!/bin/sh
# Network-resilient npm install script for Docker environments
# This script retries npm install with exponential backoff

MAX_RETRIES=5
RETRY_DELAY=10
NPM_FLAGS="--no-audit --no-fund --legacy-peer-deps --prefer-offline"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo "${RED}[ERROR]${NC} $1"
}

# Configure npm for network resilience
configure_npm() {
    log_info "Configuring npm for network resilience..."
    
    npm config set fetch-timeout 60000
    npm config set fetch-retries 5
    npm config set fetch-retry-mintimeout 20000
    npm config set fetch-retry-maxtimeout 120000
    npm config set maxsockets 5
    npm config set progress false
    npm config set loglevel warn
    
    log_info "npm configuration complete"
}

# Attempt npm install with retries
install_with_retry() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_info "Attempt $attempt of $MAX_RETRIES: Running npm install..."
        
        if npm install $NPM_FLAGS 2>&1; then
            log_info "npm install succeeded on attempt $attempt"
            return 0
        else
            local exit_code=$?
            log_warn "npm install failed with exit code $exit_code"
            
            if [ $attempt -eq $MAX_RETRIES ]; then
                log_error "npm install failed after $MAX_RETRIES attempts"
                return 1
            fi
            
            log_info "Waiting ${RETRY_DELAY}s before retry..."
            sleep $RETRY_DELAY
            
            # Exponential backoff
            RETRY_DELAY=$((RETRY_DELAY * 2))
            attempt=$((attempt + 1))
        fi
    done
    
    return 1
}

# Main execution
main() {
    log_info "Starting network-resilient npm install..."
    
    # Configure npm
    configure_npm
    
    # Run install with retries
    if install_with_retry; then
        log_info "Installation completed successfully!"
        exit 0
    else
        log_error "Installation failed. Please check your network connection and try again."
        log_info "Tips:"
        log_info "  - Check if you're behind a corporate proxy"
        log_info "  - Try using a different npm registry mirror"
        log_info "  - Check Docker network settings"
        log_info "  - Consider using docker-compose.override.yml with DNS settings"
        exit 1
    fi
}

# Run main function
main
