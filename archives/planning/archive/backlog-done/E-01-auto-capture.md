# Epic E-01: Auto-capture (Lifecycle Hooks)

**Epic Owner**: Backend Team
**Status**: Ready for Sprint 1
**Priority**: P0
**Estimate**: 5 days

---

## Overview

Implémenter un système de lifecycle hooks qui capture automatiquement les événements Claude Code et les stocke dans Nexus pour compression et réutilisation.

---

## Business Value

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Temps sauvegarde | 15 min/session | 0 min (auto) | -100% |
| Couverture contexte | 20% | 80% | +60% |
| Mémoires créées | 2/week | 15/week | +650% |

---

## User Stories

| ID | Story | Points | Sprint |
|----|-------|--------|--------|
| S-01 | Hook Session Start | 2 | 1 |
| S-02 | Hook Post-Tool | 3 | 1 |
| S-03 | Compression AI | 5 | 1 |
| S-04 | Context Injection | 3 | 1 |

See individual story files for details.

---

## Technical Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude Code    │     │   Nexus Hooks    │     │   Nexus API     │
│                 │     │                  │     │                 │
│  Session Start  │────▶│  sessionStart()  │────▶│  POST /memory   │
│                 │     │                  │     │                 │
│  Tool Use       │────▶│  postTool()      │────▶│  POST /capture  │
│                 │     │                  │     │                 │
│  Session End    │────▶│  sessionEnd()    │────▶│  POST /distill  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                    ┌─────────────┐
                                                    │   SQLite    │
                                                    │  + FTS5     │
                                                    └─────────────┘
```

---

## Database Schema Changes

```sql
-- New table for observations brutes
CREATE TABLE observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  hook_name TEXT NOT NULL,  -- 'sessionStart', 'postTool', 'sessionEnd'
  payload JSON NOT NULL,
  timestamp INTEGER NOT NULL,
  processed BOOLEAN DEFAULT FALSE
);

-- New table pour candidates (avant distillation)
CREATE TABLE candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL,  -- 'diff', 'chunks', 'folder'
  sources JSON NOT NULL,  -- list of observation IDs
  status TEXT DEFAULT 'pending',  -- 'pending', 'distilled', 'rejected'
  tags JSON DEFAULT '[]',
  created_at INTEGER NOT NULL
);

-- Index pour queries rapides
CREATE INDEX idx_observations_session ON observations(session_id);
CREATE INDEX idx_observations_processed ON observations(processed);
CREATE INDEX idx_candidates_status ON candidates(status);
```

---

## API Endpoints

### POST /capture
Capture une observation brute

**Request**:
```json
{
  "session_id": "uuid",
  "hook_name": "postTool",
  "payload": {
    "tool": "Read",
    "path": "./src/index.ts",
    "result": "..."
  }
}
```

**Response**: `201 Created` with observation ID

### POST /distill
Déclenche la compression LLM

**Request**:
```json
{
  "session_id": "uuid"
}
```

**Response**: `200 OK` with list of created candidate IDs

### GET /candidates/:id
Récupère un candidat pour review

**Response**:
```json
{
  "id": 42,
  "session_id": "uuid",
  "kind": "diff",
  "sources": [1, 2, 3],
  "tags": ["auth", "security"],
  "observations": [
    {"id": 1, "payload": {...}},
    ...
  ]
}
```

---

## Hook Scripts

### `sessionStart.sh`
```bash
#!/bin/bash
SESSION_ID=$(uuidgen)
echo $SESSION_ID > ~/.nexus/session-id

curl -X POST http://localhost:3001/capture \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"hook_name\": \"sessionStart\",
    \"payload\": {
      \"cwd\": \"$(pwd)\",
      \"branch\": \"$(git branch --show-current)\",
      \"timestamp\": $(date +%s)
    }
  }"
```

### `postTool.sh`
```bash
#!/bin/bash
SESSION_ID=$(cat ~/.nexus/session-id)

# Filter sensitive content
if [[ "$TOOL_OUTPUT" =~ (password|token|secret|api_key) ]]; then
  echo "[NEXUS] Skipping sensitive content"
  exit 0
fi

curl -X POST http://localhost:3001/capture \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"hook_name\": \"postTool\",
    \"payload\": {
      \"tool\": \"$TOOL_NAME\",
      \"params\": $TOOL_PARAMS,
      \"result\": $(echo "$TOOL_OUTPUT" | jq -Rs .)
    }
  }"
```

### `sessionEnd.sh`
```bash
#!/bin/bash
SESSION_ID=$(cat ~/.nexus/session-id)

curl -X POST http://localhost:3001/capture \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"hook_name\": \"sessionEnd\",
    \"payload\": {
      \"duration\": $SECONDS,
      \"timestamp\": $(date +%s)
    }
  }"

# Trigger distillation
curl -X POST http://localhost:3001/distill \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\"}"

rm ~/.nexus/session-id
```

---

## Definition of Done

Epic is complete when:
- [ ] All 4 user stories completed
- [ ] Hooks installables via `npm install nexus-hooks`
- [ ] Compression LLM fonctionne (10:1 ratio)
- [ ] Context injection testée en E2E
- [ ] Documentation hooks install complète
- [ ] Aucune donnée sensible capturée (audit OK)

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Claude Code hooks API | External | ⏳ To verify |
| MISTRAL_API_KEY | Config | ✅ OK |
| Schema migrations | Internal | ⏳ Blocked by DB review |

---

## Risks

See R-01 (Hooks API), R-04 (LLM Failure), R-06 (Privacy) in `product/07-risks.md`

---

## Open Questions

| Question | Impact | Decision Needed |
|----------|--------|-----------------|
| Format exact du payload hook ? | High | Sprint 0 |
| Timeout pour compression LLM ? | Medium | Sprint 1 |
| Fallback si hooks fail ? | Medium | Sprint 1 |

---

## Notes

- Inspiré de `claude-mem` : https://github.com/thedotmack/claude-mem
- Hook scripts doivent être idempotents
- Session ID stocké dans fichier temp pour lien entre hooks
