# Diagnostic Scripts

The `scripts/` directory contains standalone diagnostic and analysis scripts for the Free Context MCP server.

## Available Scripts

### test-automemoize.ts

Tests the auto-memoization feature by:
- Creating test memories with patterns
- Triggering auto-memoize hooks
- Verifying automatic context creation
- Checking relationship detection

**Run:** `bun run diagnose:automemoize`

### test-token-usage.ts

Analyzes token usage patterns by:
- Running sample searches
- Measuring token counts
- Comparing different search modes
- Generating usage reports

**Run:** `bun run diagnose:tokens`

## Usage

All scripts can be run from the project root:

```bash
# Test auto-memoization
bun run diagnose:automemoize

# Analyze token usage
bun run diagnose:tokens
```

Or directly:

```bash
bun scripts/test-automemoize.ts
bun scripts/test-token-usage.ts
```

## Notes

- These are diagnostic scripts, not unit tests
- They may modify the database
- Use them to verify features work as expected
- For automated testing, see `docs/TESTING.md`
