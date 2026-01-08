#!/bin/bash
# Install cron job for log rotation

# Get the server directory (parent of scripts/shell)
SCRIPT_DIR="$(dirname "$0")"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVER_DIR"

SCRIPT_PATH="$(pwd)/scripts/shell/rotate-logs.sh"
CRON_JOB="0 * * * * $SCRIPT_PATH >/dev/null 2>&1"

echo "Installing log rotation cron job..."

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "rotate-logs.sh"; then
  echo "⚠️  Cron job already exists. Removing old one..."
  crontab -l 2>/dev/null | grep -v "rotate-logs.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Log rotation installed (runs every hour)"
echo "📝 Script: $SCRIPT_PATH"
echo ""
echo "Current crontab:"
crontab -l | grep "rotate-logs.sh"
