# Free Context

A Model Context Protocol (MCP) server for context and memory management with advanced search features and a modern web dashboard.

## Features

- **MCP Protocol Support** - Works with Claude Code and any MCP-compatible client
- **HTTP API** - REST API for web integrations
- **Full-Text Search** - SQLite FTS5 with fuzzy matching
- **Smart Search** - Hybrid FTS5 + TF-IDF ranking
- **Web Dashboard** - Modern React UI for managing contexts and memories
- **Auto-Memoization** - Intelligent duplicate detection
- **File Search** - Fast code search with mgrep (ripgrep wrapper)

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.1+

### Installation

```bash
# Clone and install
git clone https://github.com/your-username/free-context.git
cd free-context

# Install server dependencies
cd server && bun install

# Install frontend dependencies
cd ../front && bun install
```

### Running

```bash
# Terminal 1: Start the API server
cd server && bun run start:api

# Terminal 2: Start the web dashboard
cd front && bun run dev
```

The dashboard will be available at `http://localhost:3000`

### Using with Claude Code

Add the MCP server to your Claude Code configuration:

```bash
# Via stdio (local)
claude mcp add free-context -- bun run /path/to/free-context/server/dist/index.js

# Via HTTP (remote)
claude mcp add free-context --transport http http://your-server:3001/mcp
```

## Architecture

```
free-context/
├── server/              # MCP Server (Bun + SQLite)
│   ├── src/
│   │   ├── tools/      # MCP tools (9 tools)
│   │   ├── api/        # REST API (Hono)
│   │   ├── storage/    # Drizzle ORM + SQLite
│   │   ├── hooks/      # Hook system
│   │   └── automations/
│   ├── data/           # SQLite database
│   └── migrations/
│
├── front/              # Web Dashboard (TanStack Start)
│   ├── src/
│   │   ├── routes/     # File-based routing
│   │   ├── components/ # shadcn/ui components
│   │   ├── stores/     # Zustand state
│   │   └── lib/
│   └── vite.config.ts
│
└── docs/               # Documentation
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `create_context` | Create a new context (collection of memories) |
| `list_contexts` | List all contexts with pagination |
| `add_memory` | Add a memory to a context |
| `search_memories` | Search with compact excerpts (token-efficient) |
| `smart_search` | Hybrid FTS5 + TF-IDF search |
| `find_relationships` | Find connections between memories |
| `auto_save_memory` | Save with duplicate detection |
| `mgrep` | Fast file content search |
| `mgrep_files` | Fast file discovery |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contexts` | List all contexts |
| POST | `/api/contexts` | Create a context |
| GET | `/api/contexts/:id` | Get a context |
| PUT | `/api/contexts/:id` | Update a context |
| DELETE | `/api/contexts/:id` | Delete a context |
| GET | `/api/memories` | List memories |
| POST | `/api/memories` | Create a memory |
| POST | `/api/search` | Search memories |
| GET | `/api/health` | Health check |

## Configuration

Environment variables (server):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `./data/free-context.db` | SQLite database path |
| `DEBUG` | `false` | Enable debug logging |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `CORS_ORIGINS` | `localhost:*` | Comma-separated origins |

## Development

```bash
# Server
cd server
bun run dev        # Development mode
bun run build      # Production build
bun test           # Run tests

# Frontend
cd front
bun run dev        # Development server
bun run build      # Production build
bun run check      # Lint + format
```

## Docker

```bash
# Build and run
docker build -t free-context .
docker run -p 3001:3001 -v ./data:/app/server/data free-context
```

## Technology Stack

- **Runtime**: [Bun](https://bun.sh)
- **Server**: [Hono](https://hono.dev), [Drizzle ORM](https://orm.drizzle.team)
- **Database**: SQLite with FTS5
- **Frontend**: [TanStack Start](https://tanstack.com/start), React 19
- **UI**: [Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com)
- **Protocol**: [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT
