# Testing Guide

## Test Structure

```
test/
├── search-first.test.ts   # Unit tests for search-first MCP tool
├── mcp.test.ts            # MCP protocol compliance tests
└── mgrep.test.ts          # Tests for mgrep file search utility
```

## Running Tests

### Run All Tests
```bash
bun test
```

### Run Specific Test Suites

```bash
# Unit tests for search-first tool
bun run test:unit

# MCP protocol tests
bun run test:mcp

# File search utility tests
bun run test:mgrep

# All tests
bun run test:all
```

### Run Individual Test Files

```bash
bun test test/search-first.test.ts
bun test test/mcp.test.ts
bun test test/mgrep.test.ts
```

## Test Categories

### Unit Tests (`search-first.test.ts`)

Tests the `searchMemories` MCP tool directly without HTTP layer.

**Coverage:**
- Search with different modes (compact, standard, detailed)
- Token usage estimation
- Excerpt generation
- FTS5 ranking
- Filtering by context, type, stack
- Empty result handling
- Metadata inclusion

**Run:** `bun run test:unit`

### MCP Tests (`mcp.test.ts`)

Tests MCP protocol compliance and tool functionality.

**Coverage:**
- MCP tool registration
- Request/response format
- Memory CRUD operations
- Context operations
- Relationship detection

**Run:** `bun run test:mcp`

### Utility Tests (`mgrep.test.ts`)

Tests the mgrep file search utility.

**Coverage:**
- Pattern matching
- File discovery
- Performance benchmarks

**Run:** `bun run test:mgrep`

## Test Database

Tests use a separate SQLite database (`free-context.test.db`) that is:

1. Created in `beforeAll` hooks
2. Populated with test data
3. Cleaned up after tests

The test database is never used for development or production data.

## Writing New Tests

### Template for Unit Tests

```typescript
import { beforeAll, describe, test, expect } from 'bun:test';
import { yourFunction } from '../src/path/to/function.js';

describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup: Initialize database, insert test data
  });

  test('should do something specific', async () => {
    const result = await yourFunction({
      // test parameters
    });

    expect(result).toBeDefined();
    expect(result.someProperty).toBe(expectedValue);
  });
});
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# Example for GitHub Actions
- name: Run tests
  run: |
    cd server
    bun install
    bun run test:all
```

## Test Data Management

Test data is managed through:
- `beforeAll` hooks for setup
- `afterAll` hooks for cleanup
- Separate test database to avoid pollution
- Deterministic IDs using `generateId()`

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Determinism**: Use fixed values, not random data
4. **Speed**: Tests should run quickly
5. **Clarity**: Test names should describe what they test
6. **Coverage**: Test both success and failure cases

## Troubleshooting

### Tests Fail with Database Errors

```bash
# Recreate test database
rm free-context.test.db
bun run db:push
```

### Import Errors

```bash
# Rebuild the project
rm -rf dist/
bun run build
```
