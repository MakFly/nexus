#!/bin/bash
# Nexus Development Startup Script
# Starts @api and @web in parallel

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Nexus development environment..."
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start API
echo "📡 Starting API on port 3001..."
cd "$SCRIPT_DIR/apps/api"
bun run dev &
API_PID=$!

# Start Web
echo "🌐 Starting Web UI..."
cd "$SCRIPT_DIR/apps/web"
bun run dev &
WEB_PID=$!

echo ""
echo "✅ Services started!"
echo "   - API: http://localhost:3001"
echo "   - Web: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background jobs
wait
