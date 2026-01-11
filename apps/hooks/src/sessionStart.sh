#!/bin/bash
# sessionStart.sh - Nexus Hook for Claude Code Session Start
# Compatible: Claude Opus (~/.claude/) + GLM-4 (~/.claude-glm/)

set -e

# Configuration
NEXUS_API="${NEXUS_API:-http://localhost:3001}"
LOG_FILE="$HOME/.nexus/hooks.log"
SESSION_ID_FILE="$HOME/.nexus/session-id"

# Create log directory if not exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$SESSION_ID_FILE")"

# Generate unique session ID
SESSION_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")

# Capture session info
CWD=$(pwd)
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "no-git")
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
TIMESTAMP=$(date +%s)
USERNAME=$(whoami)

# Create payload
PAYLOAD=$(cat <<EOF
{
  "cwd": "$CWD",
  "git_branch": "$GIT_BRANCH",
  "git_sha": "$GIT_SHA",
  "timestamp": $TIMESTAMP,
  "username": "$USERNAME"
}
EOF
)

# Call API (non-blocking - continue even if API fails)
RESPONSE=$(curl -s -X POST "$NEXUS_API/capture" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"hook_name\": \"sessionStart\",
    \"payload\": $PAYLOAD
  }" 2>&1)

# Check result
if echo "$RESPONSE" | grep -qi "error\|refused\|down"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] sessionStart: API unavailable - $RESPONSE" >> "$LOG_FILE"
  # Still persist session_id for local tracking
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] Session started: $SESSION_ID ($GIT_BRANCH)" >> "$LOG_FILE"
fi

# Persist session_id (always do this, even if API fails)
echo "$SESSION_ID" > "$SESSION_ID_FILE"

# Context injection (only if NEXUS_NO_INJECT is not set)
if [ -z "$NEXUS_NO_INJECT" ] && [ -n "$SESSION_ID" ]; then
  CONTEXT=$(curl -s "$NEXUS_API/context/inject?session_id=$SESSION_ID" 2>/dev/null || echo "")

  if [ -n "$CONTEXT" ] && [ "$CONTEXT" != "null" ] && [ "$CONTEXT" != "error" ]; then
    echo ""
    echo "## 🧠 Nexus Project Context"
    echo "$CONTEXT"
    echo ""
  fi
fi

# Exit cleanly (non-blocking for Claude Code)
exit 0
