# Nexus Hooks - Claude Code Lifecycle Hooks

**Version**: 1.0.0
**Status**: Development
**Compatible**: Claude Opus (~/.claude/) + GLM-4 (~/.claude-glm/)

---

## Overview

Nexus Hooks provide automatic capture of Claude Code sessions, compressing observations into actionable memories. This achieves feature parity with `claude-mem` while adding Nexus-specific pattern learning.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│  Nexus Hooks     │────▶│   Nexus API     │
│                 │     │                  │     │                 │
│  Session Start  │────▶│  sessionStart.sh │────▶│  POST /capture  │
│                 │     │                  │     │                 │
│  Tool Use       │────▶│  postTool.sh     │────▶│  POST /capture  │
│                 │     │                  │     │                 │
│  Session End    │────▶│  sessionEnd.sh   │────▶│  POST /distill  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │   SQLite DB     │
                                                    │  + Compression  │
                                                    └─────────────────┘
```

---

## Hook Scripts

### 1. sessionStart.sh

**Triggers**: When a new Claude Code session begins

**Captures**:
- Current working directory
- Git branch name
- Git commit SHA
- Timestamp
- Username

**Actions**:
1. Generate unique session_id (UUID v4)
2. Capture session metadata
3. Call `POST /capture` with observation
4. Persist session_id to `~/.nexus/session-id`
5. Fetch and display context injection (optional)

**Environment Variables**:
```bash
NEXUS_API="http://localhost:3001"  # Default
NEXUS_NO_INJECT="1"                 # Disable context injection
```

### 2. postTool.sh

**Triggers**: After each tool execution (Read, Edit, Bash, etc.)

**Captures**:
- Tool name
- Tool parameters (sanitized)
- Tool result (truncated to 10KB)

**Privacy Filters** (automatically applied):
- `password`, `passwd`, `pwd` → `[REDACTED]`
- `token`, `api_key`, `apikey` → `[REDACTED]`
- `secret`, `private_key` → `[REDACTED]`
- JWT `Bearer` tokens → `[REDACTED]`
- UUID v4 patterns → `[REDACTED]`

**Private Tag Handling**:
- If `<private>` tag detected → skip capture entirely

**Batching**:
- Observations queued in `~/.nexus/queue/`
- Flush when 10 items accumulated OR 5 seconds elapsed

### 3. sessionEnd.sh

**Triggers**: When Claude Code session ends

**Actions**:
1. Capture final session metadata (duration)
2. Call `POST /capture` with sessionEnd observation
3. Trigger distillation: `POST /distill`
4. Clean up session_id file

---

## Installation

### For Claude Opus (~/.claude/)

```bash
cd /path/to/nexus
bun install

# Link hooks
mkdir -p ~/.claude/hooks
ln -s $(pwd)/apps/hooks/src/*.sh ~/.claude/hooks/

# Or copy
cp apps/hooks/src/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```

### For GLM-4 (~/.claude-glm/)

```bash
# Same as above, but for GLM
mkdir -p ~/.claude-glm/hooks
ln -s $(pwd)/apps/hooks/src/*.sh ~/.claude-glm/hooks/
# or
cp apps/hooks/src/*.sh ~/.claude-glm/hooks/
chmod +x ~/.claude-glm/hooks/*.sh
```

---

## API Endpoints

### POST /capture

Capture a single observation.

**Request**:
```json
{
  "session_id": "uuid-v4",
  "hook_name": "sessionStart" | "postTool" | "sessionEnd",
  "payload": {
    "cwd": "/path/to/project",
    "git_branch": "main",
    "timestamp": 1705000000
  }
}
```

**Response**: `201 Created`
```json
{
  "id": 42,
  "session_id": "uuid-v4"
}
```

### POST /capture/batch

Capture multiple observations (optimized for postTool).

**Request**:
```json
{
  "observations": [
    { "session_id": "...", "hook_name": "postTool", "payload": {...} },
    { "session_id": "...", "hook_name": "postTool", "payload": {...} }
  ]
}
```

**Response**: `200 OK`
```json
{
  "count": 2
}
```

### POST /distill

Trigger LLM compression of session observations.

**Request**:
```json
{
  "session_id": "uuid-v4"
}
```

**Response**: `200 OK`
```json
{
  "session_id": "uuid-v4",
  "candidates_count": 2,
  "compression_ratio": 12.5
}
```

### GET /context/inject

Fetch context for session injection.

**Query Parameters**:
- `session_id`: UUID from sessionStart

**Response**: `200 OK` (plain text)
```
## 🧠 Nexus Project Context

### 📍 Branch: main

#### Recent Decisions
- [D-42] Used SQLite for storage (2 days ago)

#### Known Issues
- [B-15] Token refresh fails on Safari (5 days ago)

*Use /nexus to explore full context*
```

---

## Privacy & Security

### Automatic Filtering

All hooks automatically filter sensitive patterns:

| Pattern | Example | Replacement |
|---------|---------|-------------|
| Passwords | `password=secret123` | `password=[REDACTED]` |
| API Keys | `api_key: "sk-..."` | `api_key: [REDACTED]` |
| JWT | `Bearer eyJhbG...` | `Bearer [REDACTED]` |
| UUID v4 | `01234567-0123-0123-0123-0123456789ab` | `[UUID]` |

### Private Tag

Wrap sensitive content in `<private>` tags:

```
Here's my API key: <private>sk-abc123</private>
```

Hooks will skip capturing this content entirely.

### Logs

All hook activity logged to `~/.nexus/hooks.log`:
- **NO** sensitive data in logs
- Errors logged with context
- Success messages with session_id only

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXUS_API` | `http://localhost:3001` | Nexus API endpoint |
| `NEXUS_NO_INJECT` | unset | Set to `1` to disable context injection |
| `NEXUS_VERBOSE` | unset | Set to `1` for verbose logging |

### Session ID Persistence

Session IDs stored in `~/.nexus/session-id`:
- Shared across all hooks in a session
- Created by sessionStart.sh
- Cleaned up by sessionEnd.sh

---

## Troubleshooting

### Hook not executing

1. Check file permissions: `ls -la ~/.claude/hooks/*.sh`
2. Verify shebang: `head -1 ~/.claude/hooks/sessionStart.sh`
3. Check logs: `tail -f ~/.nexus/hooks.log`

### API not reachable

1. Verify API running: `curl http://localhost:3001/stats`
2. Check NEXUS_API env var: `echo $NEXUS_API`
3. Review error logs

### Context injection not working

1. Check if disabled: `echo $NEXUS_NO_INJECT`
2. Verify memories exist in DB
3. Check API endpoint: `curl "http://localhost:3001/context/inject?session_id=test"`

---

## Development

### Testing Hooks Locally

```bash
# Test sessionStart
bash apps/hooks/src/sessionStart.sh

# Test postTool
export NEXUS_TOOL_NAME="Read"
export NEXUS_TOOL_PARAMS='{"path":"test.ts"}'
export NEXUS_TOOL_RESULT='console.log("hello")'
bash apps/hooks/src/postTool.sh

# Test sessionEnd
bash apps/hooks/src/sessionEnd.sh
```

### Watching Logs

```bash
tail -f ~/.nexus/hooks.log
```

---

## Compatibility

| Platform | Status | Notes |
|----------|--------|-------|
| Claude Opus | ✅ Supported | ~/.claude/ |
| GLM-4 | ✅ Supported | ~/.claude-glm/ |
| Linux | ✅ Supported | Native bash |
| macOS | ✅ Supported | BSD bash compatible |
| WSL | ✅ Supported | Linux compatibility |

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Hook latency | < 100ms | Non-blocking |
| Batch flush | < 500ms | 10 observations |
| Context injection | < 2s | Full fetch + format |

---

## Next Steps

See implementation stories:
- [S-01: Hook Session Start](../../planning/backlog/stories/S-01-hook-session-start.md)
- [S-02: Hook Post-Tool](../../planning/backlog/stories/S-02-hook-post-tool.md)
- [S-03: Compression AI](../../planning/backlog/stories/S-03-compression-ai.md)
- [S-04: Context Injection](../../planning/backlog/stories/S-04-context-injection.md)
