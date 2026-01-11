# Story S-01: Hook Session Start

**Epic**: E-01 Auto-capture
**Status**: Ready
**Priority**: P0
**Points**: 2
**Sprint**: 1

---

## User Story

**As a** développeur utilisant Claude Code
**I want** que Nexus capture automatiquement le début de session
**So that** je peux tracer l'historique des sessions et le contexte initial

---

## Acceptance Criteria

### AC-01: Capture Session Start
```gherkin
Given Claude Code démarre une nouvelle session
When le hook sessionStart est exécuté
Then une observation est créée dans Nexus:
  - type: "session"
  - scope: "branch" (current git branch)
  - title: "Session started on {branch}"
  - narrative contient:
    * Current working directory
    * Git branch name
    * Git commit SHA (short)
    * Timestamp (Unix epoch)
    * Username (OS level)
  - status: "captured"
```

### AC-02: Session ID Persistence
```gherkin
Given le hook sessionStart est exécuté
When une observation est créée
Then:
  - Un session_id (UUID v4) est généré
  - Le session_id est stocké dans ~/.nexus/session-id
  - Le session_id est retourné au hook pour usage futur
```

### AC-03: Hook Installation
```gherkin
Given un développeur installe nexus-hooks
When l'installation est terminée
Then:
  - Le script sessionStart.sh est installé dans ~/.claude/hooks/
  - Le hook a les permissions d'exécution (+x)
  - Le hook est référencé dans ~/.claude/config.json
```

### AC-04: Error Handling
```gherkin
Given le hook sessionStart est exécuté
When l'API Nexus n'est pas accessible
Then:
  - L'erreur est loguée dans ~/.nexus/hooks.log
  - Le session_id est quand même créé (fallback local)
  - Claude Code peut continuer normalement (non-blocking)
```

---

## Technical Specification

### Hook Script: `sessionStart.sh`

```bash
#!/bin/bash
set -e

NEXUS_API="${NEXUS_API:-http://localhost:3001}"
SESSION_ID=$(uuidgen)
LOG_FILE="$HOME/.nexus/hooks.log"

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

# Call API
RESPONSE=$(curl -s -X POST "$NEXUS_API/capture" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"hook_name\": \"sessionStart\",
    \"payload\": $PAYLOAD
  }" 2>&1)

# Check result
if echo "$RESPONSE" | grep -q "error"; then
  echo "[$(date)] [ERROR] sessionStart: $RESPONSE" >> "$LOG_FILE"
  exit 0  # Non-blocking
fi

# Persist session_id
echo "$SESSION_ID" > ~/.nexus/session-id

echo "[$(date)] [INFO] Session started: $SESSION_ID ($GIT_BRANCH)" >> "$LOG_FILE"
```

### API Endpoint

```typescript
// POST /capture
app.post('/capture', async (c) => {
  const { session_id, hook_name, payload } = await c.req.json()

  const db = await getDb()
  const obs = db.insert('observations', {
    session_id,
    hook_name,
    payload: JSON.stringify(payload),
    timestamp: payload.timestamp || Date.now() / 1000,
    processed: false,
  })

  return c.json({ id: obs.lastInsertRowid, session_id }, 201)
})
```

---

## Definition of Done

- [ ] Hook script créé et testé
- [ ] API endpoint /capture implémenté
- [ ] Observation stockée en DB
- [ ] Session ID persisté localement
- [ ] Error handling testé (API down)
- [ ] Documentation installation
- [ ] Tests unitaires OK

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| API endpoint /capture | Internal | Blocked |
| ~/.nexus directory | Config | OK |

---

## Notes

- Hook doit être non-blocking pour ne pas ralentir Claude Code
- Session ID est partagé par tous les hooks d'une session
- Logs en ~/.nexus/hooks.log pour debugging
