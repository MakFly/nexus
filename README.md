# Ralph V3 - Minimal Context Management System for AI Coding Agents

**Version**: 3.0 (SQLite + Progressive Disclosure)
**Status**: Alpha 🚧

---

## 🚀 What is Ralph V3?

Ralph V3 is a **minimal context management system** that achieves **x10 token efficiency** through progressive disclosure, inspired by [claude-mem](https://github.com/thedotmack/claude-mem).

### Key Features

- 💾 **SQLite + FTS5** - Native full-text search, no external dependencies
- 🎯 **Progressive Disclosure** - 3-layer retrieval for x10 token efficiency
- 🪝 **3 Essential Hooks** - context, capture, summary (vs 5+ in v2)
- 🔌 **MCP Server** - 4 tools for context management
- 📊 **React Dashboard** - Real-time monitoring UI
- 🚀 **Minimal** - ~1500 LOC, <50MB memory, <1s startup

### Architecture Comparison

| Feature | Ralph V2 | Ralph V3 |
|---------|---------|----------|
| Database | PostgreSQL + Redis | SQLite (FTS5) |
| Backend | FastAPI + Docker | MCP server only |
| Services | 3 separate services | Single process |
| Lines of Code | ~5000 LOC | ~1500 LOC |
| Token Efficiency | x5 | **x10** |
| Startup Time | ~10s | **<1s** |
| Memory Usage | ~500MB | **<50MB** |

---

## 📁 Project Structure

```
ralph/                         # Core Python package
├── db/
│   ├── schema.sql            # SQLite FTS5 schema
│   └── __init__.py           # Database layer
├── hooks/
│   ├── context.py            # Session start + context injection
│   ├── capture.py            # Tool use capture
│   └── summary.py            # AI compression
├── mcp/
│   └── server.py             # MCP server with 4 tools
├── __init__.py
└── pyproject.toml

ralph-dashboard/               # React dashboard
├── src/
│   ├── api/ralph/            # Nitro API routes (SQLite queries)
│   ├── routes/               # Pages: /, /memories, /settings
│   └── hooks/use-ralph-files.ts
└── package.json
```

---

## 🎯 Progressive Disclosure (The x10 Secret)

Ralph V3 uses 3 retrieval layers, each returning more detail:

### Layer 1: `search_index()` - ~50 tokens
```json
{
  "count": 15,
  "observation_ids": [1, 2, 3, 4, 5, ...],
  "note": "Use get_timeline or get_full to retrieve details"
}
```
**Use case**: Initial search - "find authentication code"

### Layer 2: `get_timeline()` - ~150 tokens/observation
```json
{
  "id": 1,
  "timestamp": "2026-01-06T22:00:00",
  "type": "decision",
  "category": "backend",
  "content": "Created auth middleware with JWT",
  "file_path": "src/auth/middleware.ts"
}
```
**Use case**: Get context around results

### Layer 3: `get_full()` - ~500 tokens/observation
```json
{
  "id": 1,
  "content": "Created auth middleware with JWT",
  "code_snippet": "export function verifyToken(token: string) { ... }",
  "function_name": "verifyToken",
  "parent_id": null,
  "related_ids": "[2, 3, 4]"
}
```
**Use case**: Specific observation details only

### Layer 4: `ralph_recall()` - Smart (~100-300 tokens)
```json
{
  "query": "authentication",
  "observations": [...],  // From search_index
  "insights": [...]       // From compressed_insights
}
```
**Use case**: Most queries - combines search + insights

---

## 🔧 Installation

### 1. Install Python Package

```bash
cd ralph
pip install -e .
```

This installs CLI commands:
- `ralph-context` - Context injection hook
- `ralph-capture` - Tool use capture hook
- `ralph-summary` - Compression hook
- `ralph-mcp` - MCP server

### 2. Configure MCP Server

Edit `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ralph": {
      "command": "ralph-mcp",
      "cwd": "/path/to/ralph"
    }
  }
}
```

### 3. (Optional) Configure Hooks

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "*",
      "hooks": [{
        "type": "prompt",
        "prompt": "{{ralph-context}}"
      }]
    }]
  }
}
```

### 4. Install Dashboard

```bash
cd ralph-dashboard
bun install
bun dev  # Runs on http://localhost:3000
```

---

## 📖 Usage

### MCP Tools (In Claude)

```python
# Layer 1: Fast search
ralph_search_index(query="auth middleware")
# Returns: { count: 5, observation_ids: [1,2,3,4,5] }

# Layer 2: Get timeline
ralph_get_timeline(session_id="myapp-2026-01-06")
# Returns: [{ id, timestamp, type, content, file_path }, ...]

# Layer 3: Get full details
ralph_get_full(observation_id=1)
# Returns: { id, content, code_snippet, function_name, ... }

# Layer 4: Smart recall (recommended)
ralph_recall(query="authentication pattern")
# Returns: { observations: [...], insights: [...] }
```

### CLI Commands

```bash
# Compress session (manual trigger)
ralph-summary --session-id myapp-2026-01-06

# View database
sqlite3 ~/.ralph/ralph.db "SELECT * FROM observations LIMIT 10;"
```

### Dashboard

Visit `http://localhost:3000`:
- **Dashboard** - Overview with stats and recent activity
- **Memories** - Searchable memory browser
- **Settings** - Configuration options

---

## 🗄️ Database Schema

### Core Tables

```sql
-- observations: Raw captured context
CREATE TABLE observations (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  project_path TEXT,
  timestamp TEXT,
  type TEXT,  -- decision, action, error, context, progress
  category TEXT,  -- backend, testing, docs, refactor, ...
  priority TEXT,  -- high, normal, low
  content TEXT,
  file_path TEXT,
  function_name TEXT,
  code_snippet TEXT
);

-- FTS5 full-text search
CREATE VIRTUAL TABLE observations_fts USING fts5(
  content, file_path, function_name, code_snippet
);

-- compressed_insights: AI-generated summaries
CREATE TABLE compressed_insights (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  project_path TEXT,
  type TEXT,  -- pattern, decision, error, architecture, summary
  title TEXT,
  content TEXT,
  confidence REAL,
  tokens_saved INTEGER
);

-- sessions: Track coding sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_path TEXT,
  task_description TEXT,
  created_at TEXT,
  peak_tokens INTEGER,
  total_saved INTEGER
);
```

---

## 🧪 Testing Token Efficiency

### Benchmark Setup

```bash
# 1. Create test session
cd my-project
# Ralph auto-creates session: my-project-YYYY-MM-DD

# 2. Do some work
# ... create files, refactor, etc ...

# 3. Compress session
ralph-summary --session-id my-project-2026-01-06

# 4. Query with progressive disclosure
# Layer 1: ~50 tokens
ralph_search_index(query="database")

# Layer 2: ~150 tokens per result
ralph_get_timeline(session_id="my-project-2026-01-06", limit=10)

# Layer 3: ~500 tokens per result
ralph_get_full(observation_id=1)
```

### Expected Results

| Query Type | Tokens Saved | Efficiency |
|------------|--------------|------------|
| search_index | 95% | x20 |
| get_timeline | 70% | x3.3 |
| get_full | 0% | x1 |
| ralph_recall | 90% | **x10** |

---

## 🔍 Troubleshooting

### Database Not Found

```bash
# Initialize manually
python -c "from ralph.db import init_database; init_database()"
```

### MCP Server Not Starting

```bash
# Check Python path
which ralph-mcp

# Run directly for debug
python -m ralph.mcp.server
```

### Dashboard Shows "Not Initialized"

```bash
# Check DB exists
ls -la ~/.ralph/ralph.db

# Check Nitro API
curl http://localhost:3000/api/ralph/status
```

---

## 📚 API Reference

### MCP Tools

| Tool | Tokens | Use Case |
|------|--------|----------|
| `search_index` | ~50 | Initial search |
| `get_timeline` | ~150/obs | Context around results |
| `get_full` | ~500/obs | Specific details |
| `ralph_recall` | ~100-300 | **Most queries** |

### Python API

```python
from ralph.db import (
  add_observation,
  search_observations,
  get_timeline,
  add_insight,
  compress_session,
)

# Add observation
obs_id = add_observation(
  session_id="myapp-2026-01-06",
  project_path="/path/to/project",
  content="Created auth middleware",
  type="decision",
  category="backend",
)

# Search
results = search_observations(query="auth", limit=20)

# Get timeline
timeline = get_timeline(session_id="myapp-2026-01-06", limit=50)
```

---

## 🛣️ Roadmap

- [ ] Beta release
- [ ] VS Code extension
- [ ] Team collaboration
- [ ] Semantic search (embeddings)
- [ ] Cross-project pattern sharing

---

## 📄 License

MIT

---

**Inspired by [claude-mem](https://github.com/thedotmack/claude-mem)**
