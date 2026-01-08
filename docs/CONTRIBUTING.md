# Contributing to Free Context

## Development Setup

### Prerequisites

- **Bun** - Fast JavaScript runtime and package manager
- **Node.js** - For frontend tooling (Vite, TanStack Router)

### Installation

```bash
# Install dependencies
bun install

# Setup database
cd server && bun run db:push
```

## Project Structure

### Server (`server/`)

```
server/
├── src/
│   ├── api/           # HTTP API routes (Hono)
│   ├── tools/         # MCP tool implementations
│   ├── storage/       # Database layer (Drizzle ORM)
│   └── config.ts      # Server configuration
├── docs/              # Server documentation
├── data/              # SQLite databases
└── scripts/           # Shell scripts & diagnostics
```

### Frontend (`front/`)

```
front/
├── src/
│   ├── routes/        # TanStack Start file-based routing
│   ├── components/    # React components (shadcn/ui)
│   ├── stores/        # Zustand state management
│   └── lib/           # Utilities and API client
└── lib/               # Auto-generated libraries
```

## Coding Conventions

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use type inference when possible
- Export types separately from implementations

### React

- Use functional components with hooks
- Prefer composition over inheritance
- Use TanStack Start's file-based routing
- Keep components small and focused

### Database

- Use Drizzle ORM migrations
- Run `bun run db:generate` after schema changes
- Run `bun run db:push` to apply migrations
- Use FTS5 for full-text search

## Testing

### Server Tests

```bash
cd server
bun test                # Run all tests
bun run test:unit       # Unit tests only
bun run test:mcp        # MCP protocol tests
```

### Frontend Tests

```bash
cd front
bun run test            # Run Vitest tests
bun run lint            # Run ESLint
```

## Scripts

### Server Management

```bash
cd server
bun run server:start    # Start server in background
bun run server:stop     # Stop server
bun run logs:rotate     # Rotate log files
```

## Commit Convention

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks

Example:

```bash
git commit -m "feat: add fuzzy search with Levenshtein distance"
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Questions?

Feel free to open an issue for clarification.
