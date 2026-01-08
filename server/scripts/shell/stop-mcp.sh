#!/bin/bash
# Stop Free Context MCP server

echo "Stopping Free Context MCP server..."

# Kill by PID file if exists
if [ -f "logs/mcp.pid" ]; then
  PID=$(cat logs/mcp.pid)
  if ps -p $PID > /dev/null 2>&1; then
    kill $PID
    echo "✅ Killed process $PID"
  fi
  rm -f logs/mcp.pid
fi

# Kill any remaining processes
pkill -f "free-context/server/src/index.ts" 2>/dev/null

sleep 1

# Check if any process is still running
REMAINING=$(ps aux | grep -E "free-context/server/src/index" | grep -v grep | wc -l)
if [ $REMAINING -eq 0 ]; then
  echo "✅ All processes stopped"
else
  echo "⚠️  Some processes may still be running"
fi
