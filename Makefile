# PharmaFleet Delivery System - Development Makefile
# Convenient commands for local development with Docker Compose

.PHONY: help dev build stop clean logs logs-backend logs-frontend db-migrate db-seed db-reset test test-data shell-backend shell-db status update-deps

# Colors for pretty output
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# Help Command
# =============================================================================
help: ## Show this help message
	@echo ""
	@echo "$(GREEN)╔════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║         PharmaFleet Delivery System - Makefile                 ║$(NC)"
	@echo "$(GREEN)╚════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Available Commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Usage Examples:$(NC)"
	@echo "  make dev          # Start all services in development mode"
	@echo "  make logs         # View all service logs"
	@echo "  make db-reset     # Reset database with migrations and seed data"
	@echo "  make test         # Run backend tests"
	@echo ""

# =============================================================================
# Docker Compose Commands
# =============================================================================
dev: ## Start all services in development mode with docker-compose up
	@echo "$(GREEN)Starting all services in development mode...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Services starting...$(NC)"
	@echo "$(YELLOW)Waiting for services to be ready...$(NC)"
	@sleep 5
	@echo "$(GREEN)✓ Backend: http://localhost:8000$(NC)"
	@echo "$(GREEN)✓ Frontend: http://localhost:3000$(NC)"
	@echo "$(GREEN)✓ Database: localhost:5444$(NC)"
	@echo "$(GREEN)✓ Redis: localhost:6379$(NC)"
	@echo ""
	@echo "$(YELLOW)Run 'make logs' to view service logs$(NC)"

build: ## Build all Docker images
	@echo "$(GREEN)Building all Docker images...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✓ Build complete!$(NC)"

stop: ## Stop all running containers
	@echo "$(YELLOW)Stopping all containers...$(NC)"
	docker-compose stop
	@echo "$(GREEN)✓ All containers stopped$(NC)"

clean: ## Stop containers and remove volumes (full reset)
	@echo "$(RED)Stopping containers and removing volumes...$(NC)"
	docker-compose down -v --remove-orphans
	@echo "$(GREEN)✓ Clean complete - all containers and volumes removed$(NC)"
	@echo "$(YELLOW)Run 'make dev' to start fresh$(NC)"

status: ## Show container status
	@echo "$(GREEN)Container Status:$(NC)"
	@echo ""
	@docker-compose ps
	@echo ""
	@echo "$(YELLOW)Docker Stats:$(NC)"
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.Status}}" 2>/dev/null || echo "No running containers"

# =============================================================================
# Logging Commands
# =============================================================================
logs: ## Show logs from all services
	@echo "$(GREEN)Showing logs from all services (Ctrl+C to exit)...$(NC)"
	docker-compose logs -f

logs-backend: ## Show only backend logs
	@echo "$(GREEN)Showing backend logs (Ctrl+C to exit)...$(NC)"
	docker-compose logs -f backend

logs-frontend: ## Show only frontend logs
	@echo "$(GREEN)Showing frontend logs (Ctrl+C to exit)...$(NC)"
	docker-compose logs -f frontend

logs-db: ## Show only database logs
	@echo "$(GREEN)Showing database logs (Ctrl+C to exit)...$(NC)"
	docker-compose logs -f db

logs-redis: ## Show only Redis logs
	@echo "$(GREEN)Showing Redis logs (Ctrl+C to exit)...$(NC)"
	docker-compose logs -f redis

# =============================================================================
# Database Commands
# =============================================================================
db-migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	docker-compose exec backend alembic upgrade head
	@echo "$(GREEN)✓ Migrations complete!$(NC)"

db-seed: ## Seed the database with test data
	@echo "$(GREEN)Seeding database with test data...$(NC)"
	@echo "$(YELLOW)Running seed scripts...$(NC)"
	docker-compose exec backend python scripts/seed_superadmin.py || echo "$(YELLOW)Superadmin seed skipped$(NC)"
	docker-compose exec backend python scripts/seed_warehouses.py || echo "$(YELLOW)Warehouse seed skipped$(NC)"
	docker-compose exec backend python seed_roles.py || echo "$(YELLOW)Roles seed skipped$(NC)"
	docker-compose exec backend python seed_drivers.py || echo "$(YELLOW)Drivers seed skipped$(NC)"
	docker-compose exec backend python scripts/seed_orders.py || echo "$(YELLOW)Orders seed skipped$(NC)"
	docker-compose exec backend python scripts/seed_notification.py || echo "$(YELLOW)Notifications seed skipped$(NC)"
	@echo "$(GREEN)✓ Database seeded!$(NC)"

db-reset: ## Reset database (drop and recreate with migrations + seed)
	@echo "$(RED)Resetting database...$(NC)"
	@echo "$(YELLOW)Stopping services...$(NC)"
	docker-compose stop backend
	@echo "$(YELLOW)Dropping and recreating database...$(NC)"
	docker-compose exec db dropdb -U postgres pharmafleet 2>/dev/null || echo "$(YELLOW)Database doesn't exist, creating new...$(NC)"
	docker-compose exec db createdb -U postgres pharmafleet
	@echo "$(GREEN)✓ Database recreated$(NC)"
	@echo "$(YELLOW)Starting backend service...$(NC)"
	docker-compose up -d backend
	@sleep 3
	@echo "$(YELLOW)Running migrations...$(NC)"
	$(MAKE) db-migrate
	@echo "$(YELLOW)Seeding data...$(NC)"
	$(MAKE) db-seed
	@echo "$(GREEN)✓ Database reset complete!$(NC)"

db-shell: ## Open PostgreSQL shell in database container
	@echo "$(GREEN)Opening PostgreSQL shell...$(NC)"
	docker-compose exec db psql -U postgres -d pharmafleet

db-backup: ## Backup database to file
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p backups
	docker-compose exec db pg_dump -U postgres pharmafleet > backups/pharmafleet_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Backup created in backups/ directory$(NC)"

db-restore: ## Restore database from backup (use: make db-restore FILE=backups/file.sql)
ifeq ($(FILE),)
	@echo "$(RED)Error: Please specify a backup file with FILE=path/to/backup.sql$(NC)"
	@echo "$(YELLOW)Usage: make db-restore FILE=backups/pharmafleet_backup_20250130_120000.sql$(NC)"
	@exit 1
endif
	@echo "$(GREEN)Restoring database from $(FILE)...$(NC)"
	docker-compose exec -T db psql -U postgres pharmafleet < $(FILE)
	@echo "$(GREEN)✓ Database restored from $(FILE)$(NC)"

# =============================================================================
# Testing Commands
# =============================================================================
test: ## Run backend tests
	@echo "$(GREEN)Running backend tests...$(NC)"
	docker-compose exec backend pytest -v
	@echo "$(GREEN)✓ Tests complete!$(NC)"

test-coverage: ## Run backend tests with coverage report
	@echo "$(GREEN)Running backend tests with coverage...$(NC)"
	docker-compose exec backend pytest --cov=app --cov-report=term-missing
	@echo "$(GREEN)✓ Coverage report complete!$(NC)"

test-data: ## Generate and load test orders
	@echo "$(GREEN)Generating and loading test orders...$(NC)"
	docker-compose exec backend python scripts/seed_orders.py
	@echo "$(GREEN)✓ Test data loaded!$(NC)"

test-unit: ## Run unit tests only
	@echo "$(GREEN)Running unit tests...$(NC)"
	docker-compose exec backend pytest tests/ -v -m "not integration"

test-integration: ## Run integration tests only
	@echo "$(GREEN)Running integration tests...$(NC)"
	docker-compose exec backend pytest tests/ -v -m integration

# =============================================================================
# Shell Access Commands
# =============================================================================
shell-backend: ## Open shell in backend container
	@echo "$(GREEN)Opening shell in backend container...$(NC)"
	docker-compose exec backend /bin/sh

shell-db: ## Open PostgreSQL shell
	@echo "$(GREEN)Opening PostgreSQL shell...$(NC)"
	docker-compose exec db psql -U postgres -d pharmafleet

shell-frontend: ## Open shell in frontend container
	@echo "$(GREEN)Opening shell in frontend container...$(NC)"
	docker-compose exec frontend /bin/sh

shell-redis: ## Open Redis CLI
	@echo "$(GREEN)Opening Redis CLI...$(NC)"
	docker-compose exec redis redis-cli

# =============================================================================
# Dependency Management Commands
# =============================================================================
update-deps: ## Update Python and npm dependencies
	@echo "$(GREEN)Updating dependencies...$(NC)"
	@echo "$(YELLOW)Updating Python dependencies...$(NC)"
	docker-compose exec backend pip install --upgrade -r requirements.txt
	@echo "$(YELLOW)Updating frontend dependencies...$(NC)"
	docker-compose exec frontend npm update
	@echo "$(GREEN)✓ Dependencies updated!$(NC)"
	@echo "$(YELLOW)Note: Rebuild containers with 'make build' to persist changes$(NC)"

backend-deps: ## Install new Python dependency (use: make backend-deps PACKAGE=package-name)
ifeq ($(PACKAGE),)
	@echo "$(RED)Error: Please specify a package with PACKAGE=package-name$(NC)"
	@echo "$(YELLOW)Usage: make backend-deps PACKAGE=requests$(NC)"
	@exit 1
endif
	@echo "$(GREEN)Installing Python package: $(PACKAGE)...$(NC)"
	docker-compose exec backend pip install $(PACKAGE)
	docker-compose exec backend pip freeze | grep -i $(PACKAGE) >> requirements.txt
	@echo "$(GREEN)✓ Package installed and added to requirements.txt$(NC)"

frontend-deps: ## Install new npm dependency (use: make frontend-deps PACKAGE=package-name)
ifeq ($(PACKAGE),)
	@echo "$(RED)Error: Please specify a package with PACKAGE=package-name$(NC)"
	@echo "$(YELLOW)Usage: make frontend-deps PACKAGE=axios$(NC)"
	@exit 1
endif
	@echo "$(GREEN)Installing npm package: $(PACKAGE)...$(NC)"
	docker-compose exec frontend npm install $(PACKAGE)
	@echo "$(GREEN)✓ Package installed$(NC)"

# =============================================================================
# Utility Commands
# =============================================================================
restart: ## Restart all services
	@echo "$(YELLOW)Restarting all services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Services restarted$(NC)"

restart-backend: ## Restart only backend service
	@echo "$(YELLOW)Restarting backend service...$(NC)"
	docker-compose restart backend
	@echo "$(GREEN)✓ Backend restarted$(NC)"

restart-frontend: ## Restart only frontend service
	@echo "$(YELLOW)Restarting frontend service...$(NC)"
	docker-compose restart frontend
	@echo "$(GREEN)✓ Frontend restarted$(NC)"

dev-logs: ## Start services and show logs immediately
	@echo "$(GREEN)Starting services with logs...$(NC)"
	docker-compose up

dev-build: ## Build and start services
	@echo "$(GREEN)Building and starting services...$(NC)"
	docker-compose up --build -d
	@echo "$(GREEN)✓ Services built and started$(NC)"

lint-backend: ## Run linting on backend code
	@echo "$(GREEN)Running backend linting...$(NC)"
	docker-compose exec backend flake8 app/ --max-line-length=100
	@echo "$(GREEN)✓ Linting complete!$(NC)"

format-backend: ## Format backend code
	@echo "$(GREEN)Formatting backend code...$(NC)"
	docker-compose exec backend black app/ --line-length=100
	@echo "$(GREEN)✓ Formatting complete!$(NC)"

# =============================================================================
# Quick Commands (Aliases)
# =============================================================================
up: dev ## Alias for 'make dev'
down: stop ## Alias for 'make stop'
ps: status ## Alias for 'make status'
sh: shell-backend ## Alias for 'shell-backend'
db: shell-db ## Alias for 'shell-db'
