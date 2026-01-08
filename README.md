# Free Context

Model Context Protocol (MCP) server for context and memory management with advanced search features and a modern web dashboard.

## Quick Start

```bash
# Install dependencies
bun install

# Start MCP server
cd server && bun run dev

# Start web dashboard (in another terminal)
cd front && bun run dev
```

## Documentation

See the [docs](docs/) folder for:
- [Project README](docs/README.md) - Complete project overview
- [Contributing](docs/CONTRIBUTING.md) - Development guide

## Project Structure

```
free-context/
├── server/              # MCP Server (Bun + SQLite)
│   ├── src/            # Source code
│   ├── docs/           # Server documentation
│   ├── data/           # SQLite databases
│   └── scripts/        # Shell scripts & diagnostics
│
├── front/              # Web Dashboard (TanStack Start)
│   ├── src/            # React components
│   └── lib/            # Utilities
│
└── docs/               # Project documentation
```

## Technology Stack

- **Server**: Bun, SQLite, Drizzle ORM, Hono
- **Frontend**: TanStack Start, React 19, Tailwind CSS, shadcn/ui
- **Protocol**: Model Context Protocol (MCP)

## License

MIT
