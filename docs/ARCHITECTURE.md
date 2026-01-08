# Free Context MCP - Architecture Design

## BMAD Methodology

### Build → Measure → Architect → Deliver

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Free Context System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐      ┌──────────────────┐      ┌─────────────┐  │
│  │   Frontend   │◄────►│   MCP Server     │◄────►│   Storage   │  │
│  │  Dashboard   │      │   (TypeScript)   │      │   Layer     │  │
│  │  TanStack    │      │                  │      │             │  │
│  │   Start      │      │  • MCP Protocol  │      │  • SQLite   │  │
│  │              │      │  • REST API      │      │  • PostgreSQL│  │
│  │  React 19    │      │  • WebSocket     │      │  • Redis    │  │
│  │  Tailwind    │      │  • Workers       │      │  (optional) │  │
│  └──────────────┘      │  • Auth          │      └─────────────┘  │
│                        └──────────────────┘                        │
│                                   │                                │
│                                   ▼                                │
│                        ┌──────────────────┐                        │
│                        │  MCP Clients     │                        │
│                        │  • Claude Code   │                        │
│                        │  • Claude Desktop│                        │
│                        │  • Custom Apps   │                        │
│                        └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend (Existing)
- **Framework**: TanStack Start (React 19.2.0)
- **Styling**: Tailwind CSS 4.0.6 + shadcn/ui
- **State**: Zustand 5.0.9
- **Database**: better-sqlite3 (client-side)
- **Routing**: File-based (TanStack Router)

### Backend (To Build)
- **Runtime**: Node.js 18+ / Bun (for performance)
- **Language**: TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk
- **API Framework**: Hono (fast, edge-compatible) or Fastify
- **Database**:
  - Primary: better-sqlite3 (dev/small deployments)
  - Production: PostgreSQL (multi-user, scalable)
- **ORM**: Drizzle ORM (type-safe, lightweight)
- **Validation**: Zod
- **WebSocket**: ws or Server-Sent Events

---

## 3. Core Components

### 3.1 MCP Server (`server/`)

```
server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── server.ts             # MCP server configuration
│   ├── tools/                # MCP tools implementation
│   │   ├── context.ts        # Context management tools
│   │   ├── memory.ts         # Memory storage/retrieval
│   │   ├── search.ts         # Advanced search
│   │   └── export.ts         # Data export
│   ├── resources/            # MCP resources (read-only data)
│   │   ├── contexts.ts       # Context resources
│   │   └── stats.ts          # Usage statistics
│   ├── prompts/              # Predefined prompts for AI
│   │   └── templates.ts      # Reusable prompt templates
│   ├── storage/              # Database layer
│   │   ├── schema.ts         # Database schema
│   │   ├── client.ts         # DB client factory
│   │   └── migrations/       # Database migrations
│   ├── api/                  # REST API endpoints
│   │   ├── contexts.ts       # CRUD for contexts
│   │   ├── memories.ts       # CRUD for memories
│   │   └── search.ts         # Search endpoint
│   ├── websocket/            # Real-time updates
│   │   └── handler.ts        # WebSocket server
│   ├── auth/                 # Authentication/authorization
│   │   └── middleware.ts     # Auth middleware
│   └── types.ts              # Shared TypeScript types
├── package.json
└── tsconfig.json
```

### 3.2 Database Schema

```sql
-- Users table (multi-user support)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  settings JSON -- user preferences
);

-- Contexts (structured knowledge containers)
CREATE TABLE contexts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[], -- array of tags for categorization
  metadata JSON, -- flexible metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Memories (individual memory entries)
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  context_id TEXT REFERENCES contexts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- 'observation', 'summary', 'note', 'code', 'decision'
  title TEXT,
  content TEXT NOT NULL,
  metadata JSON,
  embedding BLOB, -- vector embedding for semantic search
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Relationships (knowledge graph)
CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES memories(id) ON DELETE CASCADE,
  target_id TEXT REFERENCES memories(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'related', 'depends_on', 'similar', 'follows'
  strength REAL DEFAULT 1.0
);

-- Search index (FTS5)
CREATE VIRTUAL TABLE memories_fts USING fts5(
  title, content, metadata,
  content=memories,
  content_rowid=rowid
);
```

### 3.3 MCP Tools Specification

```typescript
// Tools provided by the MCP server
const tools = {
  // Context Management
  "create_context": {
    description: "Create a new context for organizing memories",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } }
      },
      required: ["name"]
    }
  },

  "list_contexts": {
    description: "List all contexts with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "string" }, // tag filter
        limit: { type: "number", default: 50 }
      }
    }
  },

  // Memory Operations
  "add_memory": {
    description: "Add a memory to a context",
    inputSchema: {
      type: "object",
      properties: {
        context_id: { type: "string" },
        type: { type: "string", enum: ["observation", "summary", "note", "code", "decision"] },
        title: { type: "string" },
        content: { type: "string" },
        metadata: { type: "object" }
      },
      required: ["context_id", "type", "content"]
    }
  },

  "get_memory": {
    description: "Get a specific memory by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  },

  "list_memories": {
    description: "List memories with filters",
    inputSchema: {
      type: "object",
      properties: {
        context_id: { type: "string" },
        type: { type: "string" },
        limit: { type: "number", default: 50 },
        offset: { type: "number", default: 0 }
      }
    }
  },

  // Search (3-layer workflow)
  "search": {
    description: "Search memories (layer 1: compact index)",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        context_id: { type: "string" },
        type: { type: "string" },
        limit: { type: "number", default: 10 }
      },
      required: ["query"]
    }
  },

  "get_memories": {
    description: "Get full memory details by IDs (layer 3)",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } }
      },
      required: ["ids"]
    }
  },

  // Advanced Features
  "link_memories": {
    description: "Create relationships between memories",
    inputSchema: {
      type: "object",
      properties: {
        source_id: { type: "string" },
        target_id: { type: "string" },
        type: { type: "string" },
        strength: { type: "number" }
      },
      required: ["source_id", "target_id", "type"]
    }
  },

  "export_context": {
    description: "Export a context and its memories",
    inputSchema: {
      type: "object",
      properties: {
        context_id: { type: "string" },
        format: { type: "string", enum: ["json", "markdown", "csv"] }
      },
      required: ["context_id"]
    }
  }
};
```

### 3.4 REST API Endpoints

```
# Contexts
GET    /api/contexts           # List contexts
POST   /api/contexts           # Create context
GET    /api/contexts/:id       # Get context
PUT    /api/contexts/:id       # Update context
DELETE /api/contexts/:id       # Delete context

# Memories
GET    /api/memories           # List memories
POST   /api/memories           # Create memory
GET    /api/memories/:id       # Get memory
PUT    /api/memories/:id       # Update memory
DELETE /api/memories/:id       # Delete memory

# Search
POST   /api/search             # Full-text + semantic search
GET    /api/suggest            # Auto-suggest queries

# Analytics
GET    /api/stats              # Usage statistics
GET    /api/graph              # Knowledge graph data

# Export/Import
POST   /api/export             # Export data
POST   /api/import             # Import data

# WebSocket
WS     /api/ws                 # Real-time updates
```

### 3.5 Dashboard Features

```
front/src/routes/
├── index.tsx                  # Dashboard overview
├── contexts/
│   ├── index.tsx              # Context list with search
│   ├── [id].tsx              # Context detail view
│   └── new.tsx               # Create context form
├── memories/
│   ├── index.tsx              # Memory timeline
│   └── [id].tsx              # Memory detail
├── search/
│   └── index.tsx              # Advanced search
├── graph/
│   └── index.tsx              # Knowledge graph visualization
├── settings/
│   └── index.tsx              # User settings
└── api/
    └── [...].tsx             # API routes (SSR)
```

---

## 4. Data Flow

### 4.1 Adding a Memory
```
User (Dashboard)           MCP Server                Storage
     │                         │                        │
     ├─ POST /api/memories ───►│                        │
     │                         ├─ Validate (Zod)        │
     │                         ├─ Generate embedding    │
     │                         ├─ Insert to DB ────────►│
     │                         ├─ Update FTS index ────►│
     │◄─ Return memory ────────┤                        │
     │                         ├─ Broadcast via WS ────┐│
     │◄─ Real-time update ─────────────────────────────┘│
```

### 4.2 Search Flow
```
Claude (MCP Client)     MCP Server                Storage
     │                         │                        │
     ├─ search(query) ────────►│                        │
     │                         ├─ FTS search ───────────►│
     │                         ├─ Vector search ───────►│
     │                         ├─ Hybrid merge          │
     │◄─ [{id, score, preview}]                       │
     │                         │                        │
     ├─ get_memories(ids) ────►│                        │
     │                         ├─ Batch fetch ──────────►│
     │◄─ [full memories]                               │
```

---

## 5. Key Improvements Over Claude-Mem

| Feature | Claude-Mem | Free Context |
|---------|-----------|--------------|
| **Deployment** | Claude Code plugin only | Standalone MCP server |
| **Multi-user** | ❌ Single user | ✅ Multi-tenant |
| **Dashboard** | Read-only viewer | Full CRUD + Analytics |
| **API** | None | REST + WebSocket |
| **Contexts** | Sessions only | Structured contexts |
| **Relationships** | ❌ None | ✅ Knowledge graph |
| **Export** | ❌ None | ✅ JSON/MD/CSV |
| **Database** | SQLite only | SQLite/PostgreSQL |
| **Search** | FTS + Chroma | Hybrid + filters |
| **Collaboration** | ❌ No | ✅ Teams, sharing |

---

## 6. Implementation Phases

### Phase 1: MVP (Build)
- [ ] Basic MCP server with tools
- [ ] SQLite database with core schema
- [ ] Context + Memory CRUD
- [ ] Basic FTS search
- [ ] Simple dashboard UI

### Phase 2: Enhancements (Measure)
- [ ] Vector search for semantic retrieval
- [ ] REST API layer
- [ ] WebSocket real-time updates
- [ ] Advanced search with filters
- [ ] Export/import functionality

### Phase 3: Production (Architect → Deliver)
- [ ] PostgreSQL support
- [ ] Multi-user with auth
- [ ] Knowledge graph visualization
- [ ] Performance optimization
- [ ] Comprehensive testing

---

## 7. Configuration

```typescript
// server/src/config.ts
export const config = {
  mcp: {
    name: "free-context",
    version: "1.0.0",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  },

  server: {
    port: parseInt(process.env.PORT || "3001"),
    host: process.env.HOST || "localhost"
  },

  database: {
    type: process.env.DB_TYPE || "sqlite", // 'sqlite' | 'postgresql'
    url: process.env.DATABASE_URL,
    sqlite: {
      path: process.env.SQLITE_PATH || "./data/free-context.db"
    }
  },

  search: {
    enableVector: process.env.ENABLE_VECTOR === "true",
    vectorModel: process.env.VECTOR_MODEL || "all-MiniLM-L6-v2"
  },

  auth: {
    enabled: process.env.AUTH_ENABLED === "true",
    secret: process.env.AUTH_SECRET
  }
};
```

---

## 8. Development Workflow

```bash
# Development
cd server && bun run dev    # Start MCP server
cd front && bun run dev     # Start dashboard

# Testing
bun run test                # Run tests
bun run lint               # Lint code

# Production
bun run build              # Build
bun run start              # Start server
```

---

This architecture provides a solid foundation for building a production-ready MCP server that improves upon claude-mem while integrating seamlessly with your existing React dashboard.
