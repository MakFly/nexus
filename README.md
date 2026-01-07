# Free Context

Context management system for AI coding agents with MCP (Model Context Protocol) integration.

## Project Structure

- `free-context-mcp/` - MCP server (TypeScript + Bun + SQLite)
- `front/` - Frontend dashboard (TanStack Start + React)
- `.claude/` - Claude Code configuration

## Features

- **Session Management**: Create and manage context sessions with malloc/free pattern
- **Memory Storage**: Store decisions, context, code snippets with full-text search
- **Checkpoints**: Save and restore context states
- **MCP Protocol**: Standard Model Context Protocol integration

## Development

> **IMPORTANT:** Always use `bun` instead of `npm` in this project.

### MCP Server

```bash
cd free-context-mcp
bun install
bun test.mjs     # Run tests
bun start        # Start MCP server
```

### Frontend

```bash
cd front
bun install
bun dev
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `context_malloc` | Initialize a new context management session |
| `context_free` | Terminate a context management session |
| `context_add_memory` | Store a memory in the current session |
| `context_search` | Search stored memories using full-text search |
| `context_checkpoint` | Create a checkpoint of the current context state |

## Database

SQLite database with FTS5 (Full-Text Search) located at `~/.free-context/database.db`.

## License

MIT
