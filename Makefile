# Makefile for Free Context MCP Server
# One command per system - keep it simple!

.PHONY: help install build dev clean server-start server-stop server-restart front-start front-build test

# Default target
help:
	@echo "Free Context MCP Server"
	@echo ""
	@echo "Server targets:"
	@echo "  make install        Install dependencies"
	@echo "  make build          Build server for production"
	@echo "  make dev            Start server in dev mode"
	@echo "  make server-start   Start API server (port 3001)"
	@echo "  make server-stop    Stop all servers"
	@echo "  make server-restart Restart API server"
	@echo ""
	@echo "Frontend targets:"
	@echo "  make front-install  Install frontend dependencies"
	@echo "  make front-build    Build frontend for production"
	@echo "  make front-start    Start frontend dev server (port 5173)"
	@echo ""
	@echo "Utilities:"
	@echo "  make test           Run tests"
	@echo "  make clean          Clean build artifacts"
	@echo "  make logs           Show server logs"
	@echo "  make status         Show running processes"

# ============================================================================
# SERVER
# ============================================================================

install:
	cd server && bun install

build:
	cd server && bun run build

dev:
	cd server && bun run dev

server-start:
	@echo "Starting API server on port 3001..."
	cd server && SERVER_MODE=API bun src/index.ts

server-stop:
	@echo "Stopping all servers..."
	@pkill -f "bun.*src/index" 2>/dev/null || true
	@pkill -f "vite.*front" 2>/dev/null || true
	@echo "Servers stopped"

server-restart:
	@echo "Restarting API server..."
	@make server-stop
	@sleep 1
	@make server-start

server-logs:
	@echo "=== Server Logs ==="
	@if [ -f /tmp/mcp-server.log ]; then cat /tmp/mcp-server.log; else echo "No log file"; fi

# ============================================================================
# FRONTEND
# ============================================================================

front-install:
	cd front && bun install

front-build:
	cd front && bun run build

front-start:
	@echo "Starting frontend dev server on port 5173..."
	cd front && bun run dev

# ============================================================================
# UTILITIES
# ============================================================================

test:
	cd server && bun run test

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf server/dist
	@rm -rf front/dist
	@rm -rf server/data/*.db
	@rm -rf /tmp/mcp-*.log
	@echo "Clean complete"

status:
	@echo "=== Running Processes ==="
	@ps aux | grep -E "bun.*src/index|vite.*front" | grep -v grep || echo "No servers running"
	@echo ""
	@echo "=== Ports ==="
	@lsof -i :3001 -i :5173 2>/dev/null || echo "Ports 3001 and 5173 are free"

# ============================================================================
# DEPLOYMENT (VPS)
# ============================================================================

deploy-vps:
	@echo "Deploying to VPS..."
	@echo "This will:"
	@echo "  1. Build the server"
	@echo "  2. Build the frontend"
	@echo "  3. Setup systemd services"
	@echo ""
	@read -p "Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		make build; \
		make front-build; \
		sudo ./scripts/deploy-vps.sh; \
	else \
		echo "Aborted"; \
	fi

# ============================================================================
# DEVELOPMENT (both servers)
# ============================================================================

dev-all:
	@echo "Starting both servers..."
	@make server-start &
	@sleep 2
	@make front-start

health:
	@echo "Checking API health..."
	@curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || echo "API not responding"
