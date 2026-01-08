#!/bin/bash
# Log rotation for Free Context MCP server
# Run this via cron or manually

# Get the server directory (parent of scripts/shell)
SCRIPT_DIR="$(dirname "$0")"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVER_DIR"

LOG_DIR="logs"
MAX_SIZE="10M"      # Rotate when log exceeds 10MB
MAX_LOGS=10         # Keep max 10 archived logs
COMPRESS_AFTER=1    # Compress logs older than 1 day

# Create log dir if needed
mkdir -p "$LOG_DIR"

MAIN_LOG="$LOG_DIR/mcp.log"

# Check if log exists and exceeds max size
if [ -f "$MAIN_LOG" ]; then
  SIZE=$(du -b "$MAIN_LOG" | cut -f1)
  MAX_BYTES=$((10 * 1024 * 1024)) # 10MB

  if [ $SIZE -gt $MAX_BYTES ]; then
    echo "[$(date)] Rotating log (size: $((SIZE / 1024 / 1024))MB)"

    # Archive current log with timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    ARCHIVE="$LOG_DIR/mcp.$TIMESTAMP.log"

    mv "$MAIN_LOG" "$ARCHIVE"

    # Create new log file
    touch "$MAIN_LOG"
    chmod 644 "$MAIN_LOG"

    # Compress old archives
    find "$LOG_DIR" -name "mcp.*.log" -type f -mtime +$COMPRESS_AFTER ! -name "*.gz" -exec gzip {} \;

    # Remove oldest compressed logs if we have too many
    ls -t "$LOG_DIR"/mcp.*.log.gz 2>/dev/null | tail -n +$((MAX_LOGS + 1)) | xargs -r rm -f

    echo "[$(date)] Log rotation complete"
  fi
fi

# Show current log status
echo "--- Log Status ---"
if [ -f "$MAIN_LOG" ]; then
  echo "Current: $(du -h "$MAIN_LOG" | cut -f1)"
fi
echo "Archives: $(ls -1 "$LOG_DIR"/mcp.*.log* 2>/dev/null | wc -l) files"
echo "Total size: $(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)"
