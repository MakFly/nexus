# Free Context MCP Server - Architecture

## Overview

Free Context is a Model Context Protocol (MCP) server that provides context and memory management capabilities with advanced search features and a Search-First architecture for optimal token efficiency.

## Project Structure

```
server/
├── src/
│   ├── api/                    # HTTP API routes (Hono)
│   │   ├── index.ts           # API router composition
│   │   ├── search.ts          # Search endpoints (POST /api/search)
│   │   ├── contexts.ts        # Context CRUD endpoints
│   │   ├── memories.ts        # Memory CRUD endpoints
│   │   ├── middleware.ts      # Error handling, CORS, logging
│   │   └── websocket.ts       # WebSocket support
│   │
│   ├── tools/                  # MCP tool implementations
│   │   ├── search-first.ts    # Search-First: compact excerpts with FTS5
│   │   ├── search.ts          # Full-text & fuzzy search
│   │   ├── memory.ts          # Memory CRUD tools
│   │   ├── context.ts         # Context CRUD tools
│   │   ├── auto-save.ts       # Auto-save pattern detection
│   │   ├── auto-analyze.ts    # Content analysis
│   │   ├── find-relationships.ts  # Memory relationship detection
│   │   └── mgrep.ts           # File search (ripgrep-based)
│   │
│   ├── automations/            # Automated operations
│   │   ├── auto-context.ts    # Automatic context creation
│   │   ├── auto-relations.ts  # Relationship detection
│   │   ├── auto-save.ts       # Smart memory saving
│   │   └── smart-search.ts    # TF-IDF & similarity search
│   │
│   ├── storage/                # Database layer
│   │   ├── client.ts          # Database connection & initialization
│   │   └── schema.ts          # Drizzle ORM schemas
│   │
│   ├── hooks/                  # Event hooks
│   ├── events/                 # Event system
│   ├── config.ts              # Server configuration
│   ├── server.ts              # Server setup (MCP & API)
│   ├── index.ts               # Main entry point
│   └── types.ts               # TypeScript definitions
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md        # This file
│   ├── BEST_PRACTICES.md      # Usage & optimization guide
│   ├── TESTING.md             # Testing documentation
│   └── SCRIPTS.md             # Diagnostic scripts
│
├── test/                       # Test suite (Bun Test)
│   ├── search-first.test.ts   # Unit tests for search-first tool
│   ├── mcp.test.ts            # MCP protocol tests
│   └── mgrep.test.ts          # File search utility tests
│
├── scripts/                    # Diagnostic scripts
│   ├── test-automemoize.ts
│   └── test-token-usage.ts
│
├── drizzle/                    # Drizzle migrations
├── migrations/                 # Database migrations
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── README.md
```

## Architecture Layers

### 1. MCP Layer (`src/tools/`)

Implements MCP tools that can be called by MCP clients (Claude Desktop, etc.).

**Key Tools:**
- `searchMemories` - Search-First approach with compact excerpts
- `search` - Traditional full-text search
- `fuzzy_search` - Fuzzy matching with Levenshtein distance
- `addMemory`, `updateMemory`, `deleteMemory` - Memory CRUD
- `createContext`, `updateContext`, `deleteContext` - Context CRUD
- `findRelationships` - Detect memory relationships

### 2. API Layer (`src/api/`)

HTTP REST API for web dashboard consumption.

**Endpoints:**
- `POST /api/search` - Search with compact excerpts (Search-First)
- `GET/POST /api/contexts` - Context management
- `GET/POST /api/memories` - Memory management
- `GET/PUT/DELETE /api/memories/:id` - Individual memory operations
- WebSocket support for real-time updates

### 3. Database Layer (`src/storage/`)

SQLite database with Drizzle ORM.

**Features:**
- FTS5 full-text search with BM25 ranking
- Virtual tables for efficient search
- Automatic migrations with Drizzle Kit
- Connection pooling

### 4. Automation Layer (`src/automations/`)

Background processing and smart features.

**Features:**
- Automatic context creation based on content
- Relationship detection between memories
- Smart search with TF-IDF
- Auto-save pattern detection

## Search-First Architecture

The Search-First architecture optimizes token usage by returning lightweight search results with intelligent excerpts instead of full content. This approach reduces token consumption by **~95%** (from ~1500 tokens per memory to ~70 tokens).

### New Tool: `search_memories`

**Location**: `server/src/tools/search-first.ts`

**Features**:
- FTS5 full-text search with BM25 ranking
- Smart excerpt generation centered on search terms
- Three modes: `compact` (~60 tokens), `standard` (~120 tokens), `detailed` (~250 tokens)
- Filters: contextId, type, stack
- Token usage tracking per result

**Usage**:
```typescript
await searchMemories({
  query: "React hooks useEffect",
  mode: "compact",
  limit: 10,
  type: "note",
  stack: "react19"
})
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "id": "1234567890-abc123",
      "title": "React Hooks Guide",
      "excerpt": "useState allows you to add state to functional components...",
      "type": "note",
      "contextId": "ctx-001",
      "contextName": "React Documentation",
      "stack": "react19",
      "score": 0.85,
      "tokens": 67
    }
  ],
  "total": 1,
  "totalTokens": 67,
  "avgTokensPerResult": 67,
  "meta": {
    "searchMethod": "fts5_bm25",
    "excerptStrategy": "smart_context_aware"
  }
}
```

### Smart Excerpt Generation

**Algorithm**: `generateSmartExcerpt(content, query, maxTokens)`

1. **Tokenize query** - Extract search terms (top 5)
2. **Score paragraphs** - Each paragraph gets points for:
   - Exact term matches: +10 points
   - Multiple occurrences: +2 points per occurrence
   - Shorter paragraphs: bonus (prefer concise snippets)
3. **Select best paragraphs** - Take highest-scoring paragraphs until token limit
4. **Generate excerpt** - Concatenate selected paragraphs with separators

### Token Savings Example

**Scenario**: 19 memories, searching for "React hooks"

| Method | Tokens | Savings |
|--------|--------|---------|
| `list_memories` | ~10,000 | - |
| `search_memories` (compact) | ~1,300 | 87% |
| `search_memories` (standard) | ~2,300 | 77% |
| `search_memories` (detailed) | ~4,700 | 53% |

### Migration Guide

**Old Pattern** (High token usage):
```
1. list_memories() → Get all memories (10k+ tokens)
2. Search through results manually
3. get_memory(id) → Get full content if needed
```

**New Pattern** (Low token usage):
```
1. search_memories({query: "...", mode: "compact"}) → Get relevant results (~1k tokens)
2. Review excerpts
3. get_memory(id) → Get full content only for selected memories
```

## Search Algorithms

| Algorithm | Use Case | Token Usage |
|-----------|----------|-------------|
| **FTS5 + BM25** | Default search | ~60-250 tokens/result |
| **Fuzzy Search** | Typos, partial matches | ~500+ tokens/result |
| **TF-IDF** | Similarity search | Variable |

### Search Flow

```
User Query
    ↓
searchMemories (MCP) or POST /api/search (HTTP)
    ↓
SQLite FTS5 with BM25 ranking
    ↓
Smart excerpt generation (context-aware)
    ↓
Compact results + token metadata
    ↓
[Optional] GET /memories/:id for full content
```

## Server Modes

The server supports three modes (controlled by `SERVER_MODE` env var):

### MCP Mode (`SERVER_MODE=MCP`)
- Runs as MCP server only
- Exposes MCP tools
- No HTTP API
- Default mode

### API Mode (`SERVER_MODE=API`)
- Runs HTTP API only
- No MCP tools
- For web dashboard

### Both Mode (`SERVER_MODE=BOTH`)
- Runs both MCP server and HTTP API
- Useful for development/testing

## Technology Stack

- **Runtime**: Bun (fast JavaScript runtime)
- **Database**: SQLite with FTS5 full-text search
- **ORM**: Drizzle ORM
- **HTTP Framework**: Hono
- **Testing**: Bun Test (built-in)
- **Protocol**: Model Context Protocol (MCP)

## Development Workflow

### Start Development Server

```bash
# MCP mode (default)
bun run dev

# API mode
bun run api:dev

# Both modes
bun run both
```

### Database Operations

```bash
# Generate migrations
bun run db:generate

# Push schema changes
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

### Testing

```bash
# All tests
bun test

# Unit tests
bun run test:unit

# API tests
bun run test:api

# MCP tests
bun run test:mcp
```

## Performance Considerations

1. **FTS5 Virtual Tables**: Instant full-text search over millions of records
2. **Connection Pooling**: Efficient database connections
3. **Compact Responses**: Minimal data transfer
4. **Lazy Loading**: Full content fetched only when needed
5. **Debounced Search**: Prevents excessive queries

## Configuration

Configuration is managed in `src/config.ts`:

- Database paths
- Server ports
- FTS5 settings
- Search defaults
- API timeouts

## Auto-Memoization

The server automatically detects and saves valuable content from tool responses:

1. **Content Analysis**: Detects patterns (code snippets, definitions, solutions)
2. **Quality Scoring**: Calculates confidence based on uniqueness, specificity
3. **Duplicate Detection**: Uses similarity check to prevent redundant memories
4. **Auto-Save**: Automatically saves if confidence > 0.65 and not a duplicate

See `docs/BEST_PRACTICES.md` for usage details.

## Security

- Input validation via Zod schemas
- SQL injection prevention (parameterized queries)
- CORS configuration
- Error handling without exposing internals

## Future Enhancements

- [ ] Vector embeddings for semantic search
- [ ] Redis caching for frequent queries
- [ ] GraphQL API alternative
- [ ] Multi-user support with authentication
- [ ] Export/import functionality
- [ ] Webhook integrations
