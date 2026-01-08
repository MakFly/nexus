# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Free Context is a **Model Context Protocol (MCP) Server** project with a modern web dashboard. It provides context management capabilities for AI interactions, featuring a full-stack React application built with TanStack Start.

## Development Commands

Always use **bun** as the package manager (npm is not used in this project):

```bash
cd front/
bun run dev          # Start development server
bun run build        # Production build
bun run preview      # Preview production build
bun run test         # Run tests with Vitest
bun run lint         # Run ESLint
bun run format       # Run Prettier
bun run check        # Format and lint code (prettier --write . && eslint --fix)
```

## Architecture

### Tech Stack
- **Framework**: TanStack Start (full-stack React with file-based routing)
- **Runtime**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 7.1.7
- **Styling**: Tailwind CSS 4.0.6 + shadcn/ui component library
- **Database**: better-sqlite3 (client-side SQLite for local data persistence)
- **State Management**: Zustand 5.0.9
- **Dev Tools**: TanStack Router Devtools + React Devtools (integrated in bottom-right corner)

### Project Structure
```
free-context/
└── front/                    # Frontend application
    ├── src/
    │   ├── routes/           # TanStack Start file-based routes
    │   ├── components/ui/   # shadcn/ui components (30+ components)
    │   ├── router.tsx        # Router configuration with routeTree
    │   └── styles.css        # Tailwind + custom styles
    ├── package.json
    ├── vite.config.ts        # Vite plugins: Tailwind, MDX, TanStack Start
    └── tsconfig.json         # Path alias: @/* → ./src/*
```

### Routing
- **File-based routing** via TanStack Router in `src/routes/`
- Route tree is auto-generated in `routeTree.gen.ts`
- Root route defines the HTML document shell with devtools

### Styling
- **Tailwind CSS v4** with Vite plugin
- **shadcn/ui** component library for consistent, accessible UI
- Design tokens and custom styles in `src/styles.css`

### MDX Support
- MDX files are supported with GitHub Flavored Markdown (tables, etc.)
- Configured via `@mdx-js/rollup` plugin in vite.config.ts

### TypeScript Configuration
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- Unused locals/parameters checked

## Code Quality

- **ESLint**: Uses TanStack's ESLint config
- **Prettier**: Configured with no semicolons, single quotes
- **Vitest**: Testing framework with @testing-library/react

## Development Notes

- The app includes integrated devtools (bottom-right corner) for debugging router and React state
- The project was recently transitioned from "Ralph MCP" to "Free Context MCP"
- SQLite is used for client-side data storage (likely for context/memory management)
