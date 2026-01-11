#!/bin/bash
# postTool.sh - Nexus Hook for Claude Code Post-Tool Capture
# Compatible: Claude Opus (~/.claude/) + GLM-4 (~/.claude-glm/)

set -e

# Configuration
NEXUS_API="${NEXUS_API:-http://localhost:3001}"
LOG_FILE="$HOME/.nexus/hooks.log"
SESSION_ID_FILE="$HOME/.nexus/session-id"
QUEUE_DIR="$HOME/.nexus/queue"

# Create queue directory
mkdir -p "$QUEUE_DIR"

# Get session_id or exit silently
if [ ! -f "$SESSION_ID_FILE" ]; then
  exit 0  # No session, skip capture
fi

SESSION_ID=$(cat "$SESSION_ID_FILE")

# Tool info from environment variables (Claude Code sets these)
TOOL_NAME="${NEXUS_TOOL_NAME:-unknown}"
TOOL_PARAMS="${NEXUS_TOOL_PARAMS:-{}}"
TOOL_RESULT="${NEXUS_TOOL_RESULT:-}"

# Check for <private> tag - skip capture if found
if echo "$TOOL_RESULT" | grep -q "<private>"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] Skipping private content" >> "$LOG_FILE"
  exit 0
fi

# Privacy filtering function
filter_sensitive() {
  local content="$1"
  # Filter passwords
  content=$(echo "$content" | sed -E 's/(password|passwd|pwd)[=:][^[:space:]]+/\1=[REDACTED]/gi')
  # Filter API keys/tokens
  content=$(echo "$content" | sed -E 's/(token|api_key|apikey|api-key|secret|private_key|private-key)[=:][^[:space:]]+/\1=[REDACTED]/gi')
  # Filter JWT Bearer tokens
  content=$(echo "$content" | sed -E 's/bearer[[:space:]]+[a-zA-Z0-9._-]+/bearer=[REDACTED]/gi')
  # Filter UUID v4 patterns
  content=$(echo "$content" | sed -E 's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[UUID]/gi')
  echo "$content"
}

# Apply privacy filtering
FILTERED_RESULT=$(filter_sensitive "$TOOL_RESULT")

# Truncate if too large (> 10KB)
MAX_SIZE=10240
RESULT_SIZE=$(echo -n "$FILTERED_RESULT" | wc -c)
if [ "$RESULT_SIZE" -gt "$MAX_SIZE" ]; then
  FILTERED_RESULT=$(echo "$FILTERED_RESULT" | cut -c1-"$MAX_SIZE")
  FILTERED_RESULT="$FILTERED_RESULT... (truncated, was $RESULT_SIZE bytes)"
fi

# Prepare payload
PAYLOAD=$(cat <<EOF
{
  "tool_name": "$TOOL_NAME",
  "tool_params": $TOOL_PARAMS,
  "tool_result": $(echo "$FILTERED_RESULT" | jq -Rs . 2>/dev/null || echo '"[JSON parse error]"'),
  "timestamp": $(date +%s)
}
EOF
)

# Queue for batch processing (write to temp file)
QUEUE_FILE="$QUEUE_DIR/$SESSION_ID.jsonl"
echo "{\"session_id\": \"$SESSION_ID\", \"hook_name\": \"postTool\", \"payload\": $PAYLOAD}" >> "$QUEUE_FILE"

# Check if we should flush the queue
QUEUE_SIZE=$(wc -l < "$QUEUE_FILE" 2>/dev/null || echo "0")

# Flush if queue is large (>= 10) or file is old (> 5 seconds)
FLUSH=false
if [ "$QUEUE_SIZE" -ge 10 ]; then
  FLUSH=true
elif [ -f "$QUEUE_FILE" ]; then
  FILE_AGE=$(($(date +%s) - $(stat -c %Y "$QUEUE_FILE" 2>/dev/null || stat -f %m "$QUEUE_FILE" 2>/dev/null || echo "0")))
  if [ "$FILE_AGE" -ge 5 ]; then
    FLUSH=true
  fi
fi

if [ "$FLUSH" = true ]; then
  # Read all queued observations
  OBSERVATIONS=$(cat "$QUEUE_FILE" | jq -s '.' 2>/dev/null || echo '[]')

  # Send batch to API
  RESPONSE=$(curl -s -X POST "$NEXUS_API/capture/batch" \
    -H "Content-Type: application/json" \
    -d "{\"observations\": $OBSERVATIONS}" 2>&1)

  # Clear queue on success
  if ! echo "$RESPONSE" | grep -qi "error\|refused\|down"; then
    rm "$QUEUE_FILE" 2>/dev/null || true
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] Batch capture failed: $RESPONSE" >> "$LOG_FILE"
  fi
fi

# Exit cleanly (non-blocking)
exit 0
