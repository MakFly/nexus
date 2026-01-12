# Nexus

> **Memory-Powered Development System for Claude Code**

Nexus replaces `claude-mem` + `mgrep` with a unified solution: code search, contextual memories, and reusable patterns via MCP.

## Why Nexus?

| Problem | Nexus Solution |
|---------|----------------|
| Wasted tokens (entire codebase loaded) | **Progressive Disclosure**: 3 layers for 10-20x savings |
| Context lost between sessions | **Memory System**: decisions, preferences, discoveries persisted |
| Repeated code patterns | **Learning System**: captures and reapplies templates |

## Installation

### Prerequisites

- Node.js >= 22.0.0
- Bun >= 1.0.0
- Python 3 (for indexer)

### Automated Installation

```bash
git clone https://github.com/your-org/nexus.git
cd nexus
./install.sh
```

The script:
1. Checks prerequisites
2. Installs dependencies (`bun install`)
3. Builds the project (`bun run build`)
4. Configures Claude Code hooks
5. Configures MCP server
6. Installs API as system service
7. Verifies everything works

### Installation Options

```bash
./install.sh              # Full installation
./install.sh --no-service # Without system service (manual API)
./install.sh --uninstall  # Complete uninstall
./install.sh --help       # Help
```

### Index Your Codebase

```bash
python3 packages/indexer-py/main.py index .
```

## Usage with Claude Code

After installation, Nexus is automatically available via MCP.

### Available MCP Tools

| Tool | Description | Tokens |
|------|-------------|--------|
| `nexus_code` | Code search (keyword/semantic/hybrid) | ~50/hit |
| `nexus_memory` | Memories (recall/get/upsert) | ~50-500/item |
| `nexus_learn` | Patterns (recall/templates/apply) | ~100-2000 |

### Progressive Disclosure (3 Layers)

```
1. RECALL    → Compact index with IDs          (~50 tokens/item)
2. TIMELINE  → Chronological context           (optional)
3. GET       → Full filtered content           (~500 tokens/item)
```

**Example:**

```typescript
// Step 1: Recall relevant memories
nexus_memory({ action: "recall", query: "auth", limit: 5 })
// → [{id: 42, summary: "JWT chosen for auth", type: "decision"}]

// Step 2: Full content if needed
nexus_memory({ action: "get", ids: [42] })
// → Complete narrative with facts/tags
```

## Architecture

```
nexus/
├── apps/
│   ├── api/           # REST API (Hono + SQLite) - Port 3001
│   ├── mcp-server/    # MCP Server (stdio)
│   ├── hooks/         # Claude Code Hooks
│   └── web/           # Web UI (React + shadcn/ui)
├── packages/
│   ├── core/          # Shared types
│   ├── storage/       # SQLite + migrations
│   ├── search/        # FTS5 + embeddings
│   └── indexer-py/    # Python indexer
├── scripts/           # Installation scripts
└── docs/              # Documentation
```

## Configuration

### Environment Variables (optional)

```bash
# apps/api/.env
PORT=3001
MISTRAL_API_KEY=your_key      # For semantic search
EMBEDDING_PROVIDER=mistral     # or 'openai' | 'ollama'
```

### Claude Configuration Files

- `~/.claude/settings.json` - Hooks
- `~/.claude.json` - MCP servers

## Commands

```bash
# Build
bun run build              # Build everything
bun run build:packages     # Build packages only
bun run build:apps         # Build apps only

# Test
bun test                   # All tests

# Development
cd apps/api && bun run src/index.ts    # API server
cd apps/web && bun run dev             # Web UI (dev)

# Database
python3 packages/indexer-py/main.py index .    # Index
python3 packages/indexer-py/main.py status     # Stats
./scripts/reset-db.sh                          # Reset
```

## Documentation

- [API Reference](docs/API.md) - REST endpoints
- [MCP Usage](docs/MCP_USAGE.md) - Detailed MCP guide
- [CLAUDE.md](CLAUDE.md) - Instructions for Claude Code

## Memory Types

| Type | Usage |
|------|-------|
| `decision` | Architectural choices |
| `preference` | User preferences |
| `fact` | Factual information |
| `discovery` | Technical discoveries |
| `bugfix` | Resolved bugs |
| `feature` | Implemented features |
| `refactor` | Refactorings done |

## Scopes

| Scope | Range |
|-------|-------|
| `repo` | Entire repository |
| `branch` | Specific branch |
| `ticket` | Ticket/Issue |
| `feature` | Specific feature |
| `global` | All projects |

## License

MIT

---

**Nexus** - *Memory-Powered Development*
