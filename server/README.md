# Free Context MCP Server

A Model Context Protocol (MCP) server for context and memory management with full-text search and **automatic memoization** capabilities.

## Features

- **Context Management**: Create, read, update, and delete contexts (collections of memories)
- **Memory Management**: Add, retrieve, list, and delete memories with different types
- **Full-Text Search**: SQLite FTS5-powered search across all memories
- **🆇 Auto-Memoization**: Automatically saves valuable content from tool responses
- **Smart Duplicate Detection**: Prevents saving redundant memories
- **Persistent Storage**: SQLite database with Drizzle ORM
- **Type Safety**: Full TypeScript support with Zod validation

## Installation

```bash
bun install
```

## Development

Start the server in development mode with hot reload:

```bash
bun run dev
```

## Build

Build for production:

```bash
bun run build
```

## Database Management

Push database schema:

```bash
bun run db:push
```

Open Drizzle Studio for database inspection:

```bash
bun run db:studio
```

## MCP Tools

### Context Tools

- `create_context` - Create a new context
- `get_context` - Get details of a specific context
- `list_contexts` - List all contexts
- `update_context` - Update an existing context
- `delete_context` - Delete a context and all its memories

### Memory Tools

- `add_memory` - Add a new memory to a context
- `get_memory` - Get details of a specific memory
- `list_memories` - List memories with optional filters
- `update_memory` - Update an existing memory
- `delete_memory` - Delete a memory

### Search Tools

- `search` - Full-text search across all memories
- `smart_search` - Hybrid search with FTS5 + TF-IDF ranking

### Automation Tools

- `auto_save_memory` - Intelligently save content with duplicate detection
- `auto_analyze_context` - Analyze content and suggest appropriate context
- `find_relationships` - Find connections between memories
- `mgrep` - Ultra-fast file content search

## Auto-Memoization (🆇)

The server automatically detects and saves valuable content from tool responses:

### How It Works

```
Tool Response → Content Analysis → Duplicate Check → Auto-Save
```

1. **Content Analysis**: Detects patterns (code snippets, definitions, solutions, decisions)
2. **Quality Scoring**: Calculates confidence based on uniqueness, specificity, structure
3. **Duplicate Detection**: Uses similarity check to prevent redundant memories
4. **Auto-Save**: Automatically saves if confidence > 0.65 and not a duplicate

### Detected Content Types

- **Code Snippets**: Functions, classes, methods with explanations
- **Definitions**: Important notes, concepts, terminology
- **Solutions**: Bug fixes, implementations, resolutions
- **Decisions**: Architectural choices, design decisions
- **API References**: Endpoints, routes, interfaces
- **Tasks**: Action items, implementation steps

### Configuration

Auto-memoization is **enabled by default**. To configure:

```env
# Disable auto-memoization
AUTO_MEMOIZE_ENABLED=false

# Adjust confidence threshold (0-1, default: 0.7)
# Higher = more selective, Lower = saves more
MEMOIZE_CONFIDENCE=0.7

# Adjust duplicate threshold (0-1, default: 0.85)
# Higher = more strict duplicate detection
MEMOIZE_DUPLICATE_THRESHOLD=0.85

# Enable debug logging
MEMOIZE_DEBUG=true
```

### Examples of Auto-Saved Content

✅ **Will be saved:**
```typescript
// Code snippet with explanation
function useMemoDeps(deps) {
  return useMemo(() => deps, deps);
}
```

✅ **Will be saved:**
```
Solution: The bug was caused by missing dependency array
in useEffect. Add the dependency array to fix it.
```

✅ **Will be saved:**
```
Definition: React.memo is a HOC that memoizes functional
components to prevent unnecessary re-renders.
```

❌ **Won't be saved:**
```
OK
Done
Sure
```

## Memory Types

- `note` - General notes
- `snippet` - Code snippets
- `reference` - Reference material
- `task` - Tasks and todos
- `idea` - Ideas and brainstorming

## Project Structure

```
server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server configuration
│   ├── config.ts             # Configuration management
│   ├── storage/
│   │   ├── schema.ts         # Database schema
│   │   └── client.ts         # Database client factory
│   ├── tools/
│   │   ├── context.ts        # Context management tools
│   │   ├── memory.ts         # Memory management tools
│   │   └── search.ts         # Search functionality
│   ├── automations/
│   │   ├── auto-save.ts      # Auto-save logic
│   │   ├── auto-context.ts   # Auto-context management
│   │   └── auto-memoize.ts   # Content detection
│   └── hooks/
│       ├── index.ts          # Hook system
│       └── auto-memoize-hook.ts # Auto-memoize hook
├── drizzle.config.ts         # Drizzle configuration
├── package.json
└── tsconfig.json
```

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and Search-First design
- **[Best Practices](docs/BEST_PRACTICES.md)** - Token optimization and usage patterns
- **[Testing](docs/TESTING.md)** - Testing guide and conventions
- **[Scripts](docs/SCRIPTS.md)** - Diagnostic and analysis scripts

## License

MIT
