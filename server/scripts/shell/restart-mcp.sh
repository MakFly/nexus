#!/bin/bash
# Restart Free Context MCP server in background (API mode)

# Get the server directory (parent of scripts/shell)
SCRIPT_DIR="$(dirname "$0")"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVER_DIR"

# Kill existing processes
pkill -f "free-context/server/src/index.ts" 2>/dev/null
pkill -f "free-context" 2>/dev/null

# Wait a moment for processes to stop
sleep 1

# Create logs and data directories
mkdir -p logs data

# Rotate logs if needed
./scripts/shell/rotate-logs.sh >/dev/null 2>&1

# Start in background with API mode (not MCP stdio mode for background)
SERVER_MODE=API nohup bun src/index.ts > logs/mcp.log 2>&1 &
PID=$!

# Save PID for later
echo $PID > logs/mcp.pid

echo "✅ Free Context server started in background (PID: $PID)"
echo "📝 Logs: logs/mcp.log (auto-rotated at 10MB)"
echo "💾 Data: data/free-context.db"
echo "🌐 API: http://localhost:3001"
echo "🛑 Stop: kill $PID"
echo ""
echo "⚠️  Note: Running in API mode. For MCP stdio mode, connect directly to client."
