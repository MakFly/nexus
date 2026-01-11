# Story S-02: Hook Post-Tool

**Epic**: E-01 Auto-capture
**Status**: Ready
**Priority**: P0
**Points**: 3
**Sprint**: 1

---

## User Story

**As a** développeur
**I want** que chaque tool usage soit capturé automatiquement
**So that** je peux revoir ce qui a été fait et comprendre le contexte

---

## Acceptance Criteria

### AC-01: Capture Tool Usage
```gherkin
Given Claude Code exécute un tool (Read, Edit, Bash, etc.)
When le hook postTool est exécuté
Then une observation candidate est créée:
  - session_id: récupéré depuis ~/.nexus/session-id
  - hook_name: "postTool"
  - payload contient:
    * tool_name: "Read" | "Edit" | "Bash" | ...
    * tool_params: paramètres du tool (sanitisés)
    * tool_result: résultat du tool (tronqué si > 10KB)
    * timestamp: moment de l'exécution
```

### AC-02: Privacy Filtering
```gherkin
Given le tool output contient des données sensibles
When le hook postTool est exécuté
Then:
  - Les patterns suivants sont filtrés (remplacés par [REDACTED]):
    * "password", "passwd", "pwd"
    * "token", "api_key", "apikey", "api-key"
    * "secret", "private_key", "private-key"
    * JWT (Bearer tokens)
    * UUIDs suspects (v4 format)
  - Le filtrage est logged dans ~/.nexus/hooks.log
```

### AC-03: <private> Tag Respect
```gherkin
Given une conversation contient le tag <private>
When le hook postTool est exécuté
Then:
  - Aucune capture n'est effectuée
  - Le message "[NEXUS] Skipping private content" est affiché
  - Le compteur de sessions privées est incrémenté
```

### AC-04: Large Result Truncation
```gherkin
Given le tool result dépasse 10KB
When le hook postTool est exécuté
Then:
  - Le résultat est tronqué à 10KB
  - Un suffixe "... (truncated)" est ajouté
  - La taille originale est stockée dans un champ metadata
```

### AC-05: Batch Optimization
```gherkin
Given plusieurs tools sont exécutés rapidement
When les hooks postTool sont appelés
Then:
  - Les observations sont batchées (max 10 ou 5 secondes)
  - Un seul appel API est fait pour le batch
  - Le nombre total d'observations est retourné
```

---

## Technical Specification

### Hook Script: `postTool.sh`

```bash
#!/bin/bash
set -e

NEXUS_API="${NEXUS_API:-http://localhost:3001}"
LOG_FILE="$HOME/.nexus/hooks.log"
SESSION_ID_FILE="$HOME/.nexus/session-id"

# Get session_id or exit
if [ ! -f "$SESSION_ID_FILE" ]; then
  exit 0  # No session, skip capture
fi

SESSION_ID=$(cat "$SESSION_ID_FILE")

# Tool info from environment variables
TOOL_NAME="$NEXUS_TOOL_NAME"
TOOL_PARAMS="$NEXUS_TOOL_PARAMS"
TOOL_RESULT="$NEXUS_TOOL_RESULT"

# Check for <private> tag
if echo "$TOOL_RESULT" | grep -q "<private>"; then
  echo "[$(date)] [INFO] Skipping private content" >> "$LOG_FILE"
  exit 0
fi

# Privacy filtering
FILTERED_RESULT=$(echo "$TOOL_RESULT" | sed -E '
  s/(password|passwd|pwd)[=:][^[:space:]]+/\1=[REDACTED]/gi
  s/(token|api_key|apikey|api-key|secret|private_key|private-key)[=:][^[:space:]]+/\1=[REDACTED]/gi
  s/bearer[[:space:]]+[a-zA-Z0-9._-]+/bearer=[REDACTED]/gi
')

# Truncate if too large (> 10KB)
MAX_SIZE=10240
RESULT_SIZE=$(echo -n "$FILTERED_RESULT" | wc -c)
if [ $RESULT_SIZE -gt $MAX_SIZE ]; then
  FILTERED_RESULT=$(echo "$FILTERED_RESULT" | cut -c1-$MAX_SIZE)
  FILTERED_RESULT="$FILTERED_RESULT... (truncated, was $RESULT_SIZE bytes)"
fi

# Prepare payload
PAYLOAD=$(cat <<EOF
{
  "tool_name": "$TOOL_NAME",
  "tool_params": $TOOL_PARAMS,
  "tool_result": $(echo "$FILTERED_RESULT" | jq -Rs .),
  "timestamp": $(date +%s)
}
EOF
)

# Queue for batch (write to temp file)
QUEUE_DIR="$HOME/.nexus/queue"
mkdir -p "$QUEUE_DIR"
QUEUE_FILE="$QUEUE_DIR/$SESSION_ID.jsonl"

echo "{\"session_id\": \"$SESSION_ID\", \"hook_name\": \"postTool\", \"payload\": $PAYLOAD}" >> "$QUEUE_FILE"

# Flush if queue is large or old
QUEUE_SIZE=$(wc -l < "$QUEUE_FILE")
if [ $QUEUE_SIZE -ge 10 ] || [ $(find "$QUEUE_FILE" -mmin +5 2>/dev/null) ]; then
  # Flush queue
  curl -s -X POST "$NEXUS_API/capture/batch" \
    -H "Content-Type: application/json" \
    -d "{\"observations\": $(cat "$QUEUE_FILE" | jq -s .)}" && \
    rm "$QUEUE_FILE"
fi
```

### API Endpoint: Batch Capture

```typescript
// POST /capture/batch
app.post('/capture/batch', async (c) => {
  const { observations } = await c.req.json()

  const db = await getDb()
  const stmt = db.prepare(`
    INSERT INTO observations (session_id, hook_name, payload, timestamp, processed)
    VALUES (?, ?, ?, ?, ?)
  `)

  for (const obs of observations) {
    stmt.run(
      obs.session_id,
      obs.hook_name,
      JSON.stringify(obs.payload),
      obs.payload.timestamp || Math.floor(Date.now() / 1000),
      false
    )
  }

  return c.json({ count: observations.length }, 200)
})
```

---

## Privacy Filter Patterns

| Pattern | Example | Replacement |
|---------|---------|-------------|
| `password=...` | `password=secret123` | `password=[REDACTED]` |
| `api_key: "..."` | `api_key: "sk-..."` | `api_key: [REDACTED]` |
| `Bearer token` | `Bearer eyJhbG...` | `Bearer [REDACTED]` |
| JWT pattern | `eyJhbGciOiJ...` | `[REDACTED]` |

---

## Definition of Done

- [ ] Hook script créé et testé
- [ ] API endpoint /capture/batch implémenté
- [ ] Privacy filtering testé avec patterns connus
- [ ] <private> tag respecté
- [ ] Truncation fonctionnel
- [ ] Batch flushing testé
- [ ] Logs vérifiés
- [ ] Tests unitaires OK

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Story S-01 (session_id) | Internal | Blocked |
| API endpoint /capture/batch | Internal | Blocked |
| jq (JSON processor) | System | OK |

---

## Security Considerations

- Toujours filtrer côté server aussi (double check)
- Logs ne doivent PAS contenir les données sensibles
- Env vars pour tool data (pas passé en arguments)

---

## Notes

- Batch optimization réduit la charge API
- Queue persistente en fichier pour crash recovery
- Fichier nettoyé après flush réussi
