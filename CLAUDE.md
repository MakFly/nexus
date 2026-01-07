# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Free Context** is a context management system for AI coding agents. This monorepo contains:

- **free-context-mcp/** - Backend MCP server (TypeScript + Bun + SQLite)
- **front/** - Frontend dashboard (TanStack Start + React)

## Important Rules

> **CRITICAL:** Always use `bun` instead of `npm` in this project.
>
> The project uses `bun:sqlite` which is built into Bun - do NOT use `better-sqlite3`.

## Development Commands

### free-context-mcp (MCP Server)

```bash
cd free-context-mcp
bun install              # Install dependencies
bun run dev              # Watch mode
bun start                # Start server
bun test.mjs             # Run tests
```

### front (Frontend)

```bash
cd front
bun install              # Install dependencies
bun dev                  # Vite dev server
bun run build            # Production build
bun check                # Format + lint fix
```

## Architecture

### MCP Server (free-context-mcp)

The MCP server provides context management tools via Model Context Protocol:

**Tools Available:**
- `context_malloc` - Initialize a new context management session
- `context_free` - Terminate a context management session
- `context_add_memory` - Store a memory in the current session
- `context_search` - Search stored memories using full-text search
- `context_checkpoint` - Create a checkpoint of the current context state

**Database:**
- SQLite with FTS5 (Full-Text Search)
- Database location: `~/.free-context/database.db`
- Tables: `sessions`, `memories`, `checkpoints`, `metrics`

**File Structure:**
```
free-context-mcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── storage/
│   │   ├── database.ts    # SQLite database wrapper
│   │   └── schemas.ts     # Zod schemas
│   └── tools/             # Tool implementations
│       ├── malloc.ts
│       ├── free.ts
│       ├── addMemory.ts
│       ├── search.ts
│       └── checkpoint.ts
└── test.mjs              # Test script
```

### Frontend (front)

Built with TanStack Start, React 19, and TypeScript.

**Components:**
- `src/components/ui/` - shadcn/ui components

**Routes:**
- `src/routes/` - TanStack Start file-based routing

## Usage Patterns

### Pattern 1: Start of Session
```
1. Call context_malloc to create a session
2. Store the sessionId for subsequent calls
3. Use context_add_memory to store important decisions
4. Use context_checkpoint before major changes
5. Call context_free when done
```

### Pattern 2: Search Past Context
```
context_search({
  query: "decision authentication",
  limit: 10
})
```

## Environment Variables

```bash
# free-context-mcp
FREE_CONTEXT_DB_PATH=~/.free-context/database.db  # Optional, default shown
```

## Adding New Tools

1. Create tool file in `free-context-mcp/src/tools/yourTool.ts`
2. Add Zod schema for input validation
3. Implement the tool function
4. Register in `src/index.ts` (ListToolsRequestSchema + CallToolRequestSchema)

## Testing

Run the MCP server tests:
```bash
cd free-context-mcp
bun test.mjs
```

This will test all tools and verify database operations.
