#!/bin/bash
# sessionEnd.sh - Nexus Hook for Claude Code Session End
# Compatible: Claude Opus (~/.claude/) + GLM-4 (~/.claude-glm/)

set -e

# Configuration
NEXUS_API="${NEXUS_API:-http://localhost:3001}"
LOG_FILE="$HOME/.nexus/hooks.log"
SESSION_ID_FILE="$HOME/.nexus/session-id"
QUEUE_DIR="$HOME/.nexus/queue"

# Get session_id or exit
if [ ! -f "$SESSION_ID_FILE" ]; then
  exit 0  # No session tracked, nothing to do
fi

SESSION_ID=$(cat "$SESSION_ID_FILE")

# Flush any remaining queued observations first
QUEUE_FILE="$QUEUE_DIR/$SESSION_ID.jsonl"
if [ -f "$QUEUE_FILE" ]; then
  OBSERVATIONS=$(cat "$QUEUE_FILE" | jq -s '.' 2>/dev/null || echo '[]')
  QUEUE_SIZE=$(echo "$OBSERVATIONS" | jq 'length' 2>/dev/null || echo "0")

  if [ "$QUEUE_SIZE" -gt 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] Flushing $QUEUE_SIZE queued observations" >> "$LOG_FILE"

    RESPONSE=$(curl -s -X POST "$NEXUS_API/capture/batch" \
      -H "Content-Type: application/json" \
      -d "{\"observations\": $OBSERVATIONS}" 2>&1)

    if ! echo "$RESPONSE" | grep -qi "error\|refused\|down"; then
      rm "$QUEUE_FILE" 2>/dev/null || true
    fi
  fi
fi

# Calculate session duration
SESSION_START_TIME=$(stat -c %Y "$SESSION_ID_FILE" 2>/dev/null || stat -f %m "$SESSION_ID_FILE" 2>/dev/null || echo "0")
CURRENT_TIME=$(date +%s)
DURATION=$((CURRENT_TIME - SESSION_START_TIME))

# Capture session end payload
PAYLOAD=$(cat <<EOF
{
  "duration": $DURATION,
  "timestamp": $CURRENT_TIME
}
EOF
)

# Call API for sessionEnd
RESPONSE=$(curl -s -X POST "$NEXUS_API/capture" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"hook_name\": \"sessionEnd\",
    \"payload\": $PAYLOAD
  }" 2>&1)

if echo "$RESPONSE" | grep -qi "error\|refused\|down"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] sessionEnd: $RESPONSE" >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] Session ended: $SESSION_ID (${DURATION}s)" >> "$LOG_FILE"
fi

# Trigger distillation (async, non-blocking)
curl -s -X POST "$NEXUS_API/distill" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\"}" \
  >> "$LOG_FILE" 2>&1 &

# Clean up session_id file
rm "$SESSION_ID_FILE" 2>/dev/null || true

# Exit cleanly
exit 0
