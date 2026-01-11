# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Version Management

**Current version: 0.0.1**

If the user says "update la version en X.X.X" (or "update version to X.X.X"), update ALL package.json files in:
- `packages/*` (core, storage, search, indexer-py/pyproject.toml)
- `apps/*` (api, cli, mcp-server, web)

Also update the CHANGELOG array in `apps/web/src/routes/changelog.index.tsx` with the new version entry.

## Project Overview

Nexus is a memory-powered development system that combines code search, contextual memories, and reusable patterns. Designed for integration with Claude Code via MCP. The project uses a monorepo architecture with workspaces managed by Bun.

**Key Concept:** Progressive Disclosure - 3-layer system to save 10-20x tokens:
1. **RECALL** (~50 tokens/item) - Compact index with IDs
2. **TIMELINE** (~150 tokens) - Chronological context (optional)
3. **GET/FETCH** (~500+ tokens/item) - Full content (filtered)

## Commands

### Build & Test
```bash
bun install                           # Install all dependencies
bun run build                         # Build all packages and apps
bun run build:packages                # Build only packages
bun run build:apps                    # Build only apps
bun test                              # Run all tests
bun run lint                          # Lint all code
```

### Individual Package Commands
```bash
# From root - use workspace filtering
bun run --filter './packages/*' test  # Test all packages
bun run --filter './apps/*' lint      # Lint all apps

# Or navigate to specific package/app
cd packages/storage && bun test
cd apps/api && bun run build
```

### API Server (apps/api)
```bash
cd apps/api
bun run src/index.ts                 # Start API server on port 3001
```

**IMPORTANT:** Never use `bun run dev` or `bun run start` - these are reserved for user explicit request only.

## Architecture

### Monorepo Structure

```
nexus/
├── packages/
│   ├── storage/       # SQLite database layer with migrations
│   ├── search/        # FTS5 + semantic search (embeddings)
│   ├── indexer/       # Code indexing (file scanner + chunker)
│   └── core/          # Shared types and exports
├── apps/
│   ├── api/           # REST API (Hono + SQLite) on port 3001
│   ├── mcp-server/    # MCP Server (stdio transport)
│   └── web/           # React UI (TanStack Router + Zustand)
```

### Dependency Flow

```
core → storage → search
core ← indexer (depends on storage + search)
api → storage + search
mcp-server → core
web → (consumes API)
```

**Key Pattern:** All shared types flow through `@nexus/core` to avoid circular dependencies.

### Package Responsibilities

**@nexus/storage** (`packages/storage/src/`)
- `database.ts` - SQLite connection, migrations, CRUD helpers
- `crud.ts` - Repository pattern for data access
- `hash.ts` - xxhash-wasm utilities

**@nexus/search** (`packages/search/src/`)
- `fts5.ts` - SQLite FTS5 search with BM25 ranking
- `ripgrep.ts` - Live grep without index
- `embeddings/` - Semantic search with Mistral/OpenAI

**@nexus/indexer** (`packages/indexer/src/`)
- `scanner.ts` - File system scanning with .gitignore support
- `chunker.ts` - Code splitting into searchable chunks
- `languages.ts` - Language detection

**@nexus/core** (`packages/core/src/index.ts`)
- Exports all types from storage/search
- Defines: `File`, `Chunk`, `Memory*`, `Pattern` interfaces

### API Endpoints (apps/api)

**Search:**
- `POST /search` - FTS5 keyword search (BM25)
- `POST /search/semantic` - Embedding-based search
- `POST /search/hybrid` - Combined semantic + keyword (70/30 default)
- `POST /grep` - Live ripgrep search
- `POST /open` - Read file/range

**Memory (Progressive Disclosure):**
- `GET /memory/recall` - Compact index (~50 tokens/item)
- `POST /memory/batch` - Full content by IDs
- `GET /memory/:id/timeline` - Chronological context
- `GET|POST|PATCH|DELETE /memory/:id` - CRUD operations
- `POST /memory/:id/links` - Link memory to code

**Patterns (Learning System):**
- `GET /patterns/recall` - Find applicable patterns (max 3)
- `GET /patterns/:id/templates` - Full templates (~2000 tokens)
- `POST /patterns/:id/apply` - Apply pattern (dry-run/write)
- `POST /patterns/:id/feedback` - Record outcome

### MCP Tools

The MCP server (`apps/mcp-server`) exposes tools with **compact output by design**:

- `code_search` → Returns: `./path/to/file:10-25 [87%] symbolName`
- `code_open` → Returns: Full file content (bounded ~200 tokens)
- `memory_recall` → Returns: `[42] decision/repo: summary (95%)`
- `memory_get` → Returns: Full narrative with facts/tags
- `learning_recall` → Returns: Max 3 patterns with success rate
- `learning_getTemplates` → Returns: ~2000 tokens of templates
- `learning_apply` → Preview (dry-run) or apply (write) patterns
- `repo_stats` → Files, chunks, embeddings counts

## Code Conventions

### TypeScript
- Target: ES2022, Module: ESNext
- Strict mode enabled
- All packages export types from `src/index.ts` or `dist/`
- Use `import.meta.dir` for resolving relative paths in ESM

### Database (SQLite + Bun)
- Migrations in `packages/storage/src/migrations/*.sql`
- WAL mode enabled for concurrency
- Foreign keys enabled
- Transaction helper: `db.transaction(() => { ... })`

**⚠️ CRITICAL - Database Location:**
- **ALL database operations MUST use `apps/api/nexus.db`**
- Python indexer default: `apps/api/nexus.db`
- API TypeScript path: `../nexus.db` (from `apps/api/src/`)
- NEVER use root `nexus.db` - this causes sync issues
- When running indexer from root, it will automatically use `apps/api/nexus.db`

**Indexation Commands:**
```bash
# From project root - index to apps/api/nexus.db by default
python3 packages/indexer-py/main.py index .
python3 packages/indexer-py/main.py status
python3 packages/indexer-py/main.py clear
```

### API Routes (Hono)
- Route handlers in `apps/api/src/routes/*.ts`
- Pattern: `createXxxRoutes(getDb: () => Promise<Database>)`
- Use `c.req.json()` for body parsing
- Return JSON with appropriate status codes

### MCP Tools
- Define in `TOOLS` array with inputSchema
- Handle in `CallToolRequestSchema` switch statement
- Return compact text output (not JSON)
- Format: `content: [{ type: 'text', text: '...' }]`

### Memory System Types

**MemoryType:** `decision` | `bugfix` | `feature` | `refactor` | `discovery` | `change` | `preference` | `fact` | `note`

**MemoryScope:** `repo` | `branch` | `ticket` | `feature` | `global`

**Progressive Disclosure Pattern:**
```typescript
// Step 1: Compact recall
const index = await memory_recall({ query: "auth", limit: 10 })

// Step 2: Filter and fetch full content
const ids = index.slice(0, 3).map(m => m.id)
const full = await memory_get({ ids })

// Step 3: Use full content
```

### Error Handling
- API routes: Return `c.json({ error: 'message' }, status)`
- MCP tools: Return `{ content: [{ type: 'text', text: 'Error: ...'}], isError: true }`
- Database: Use try/catch with rollback on error

## Sprint-Based Development

Nexus follows sprints (see `planning/sprints/`):
- Sprint 0: Foundation (storage layer)
- Sprint 1: Indexer + Search
- Sprint 2: Memory System (CRUD + Progressive Disclosure)
- Sprint 3: Learning Patterns
- Sprint 5: MCP Server

Each sprint adds database migrations and extends the schema.

## Environment

Required for full functionality:
```bash
# apps/api/.env
PORT=3001
MISTRAL_API_KEY=your_key_here  # For semantic search
EMBEDDING_PROVIDER=mistral     # or 'openai' | 'ollama'
```

The API will work without embeddings (keyword-only search).

## Important Files

- `packages/core/src/index.ts` - All shared types
- `packages/storage/src/database.ts` - Database abstraction
- `apps/api/src/index.ts` - Main API server
- `apps/mcp-server/src/index.ts` - MCP tool definitions
- `tsconfig.base.json` - Shared TypeScript config
