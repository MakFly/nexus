# Free Context

Model Context Protocol (MCP) server for context and memory management with advanced search features and a modern web dashboard.

## Quick Start

```bash
# Install dependencies
bun install

# Start MCP server
cd server && bun run dev

# Start web dashboard
cd front && bun run dev
```

## Documentation

- **[Project Setup](docs/INSTALLATION_COMPLETE.md)** - Installation and configuration
- **[MCP Setup](docs/MCP_SETUP.md)** - MCP server configuration
- **[Server Docs](server/docs/)** - Server architecture and API
- **[Frontend](front/)** - Web dashboard (TanStack Start + React)

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
    ├── INSTALLATION_COMPLETE.md
    └── MCP_SETUP.md
```

## Development

### Server (MCP + API)

```bash
cd server
bun run dev              # Development mode
bun run api:dev          # API server only
bun run test             # Run tests
```

### Frontend (Dashboard)

```bash
cd front
bun run dev              # Development server
bun run build            # Production build
```

## Technology Stack

- **Server**: Bun, SQLite, Drizzle ORM, Hono
- **Frontend**: TanStack Start, React 19, Tailwind CSS, shadcn/ui
- **Protocol**: Model Context Protocol (MCP)

## License

MIT
