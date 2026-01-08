# Proposed Addition to po/SKILL.md

## MCP Tools Optimization (CRITICAL)

When using free-context MCP tools for storing/retrieving product knowledge:

### ALWAYS follow this pattern to minimize token usage:

1. **Search first, create later**
   ```bash
   # Step 1: Search existing knowledge (compact mode - ~70 tokens)
   search_memories(query="topic", mode="compact", limit=5)

   # Step 2: Only if no relevant results, create context/memory
   create_context(name="...")

   # Step 3: Save with duplicate detection
   auto_save_memory(content="...", checkDuplicates=true)
   ```

2. **NEVER use these token-heavy tools:**
   - ❌ `list_memories()` - Returns 10k+ tokens with full content
   - ❌ `list_contexts()` - Deprecated

3. **When retrieving knowledge:**
   ```bash
   # ALWAYS use compact mode first
   search_memories(query="specific topic", mode="compact", limit=5)

   # Only get full content when absolutely necessary
   get_memory(memoryId="specific-id")
   ```

4. **When saving product artifacts:**
   ```bash
   # Use auto_save_memory with checkDuplicates
   auto_save_memory(content="# PRD...", checkDuplicates=true)

   # Returns: Only metadata (id, title, type, contextId) - NOT full content
   ```

### Token Budget for Product Work

| Operation | Token Cost | When to Use |
|-----------|------------|-------------|
| `search_memories(compact)` | ~70 tokens | **ALWAYS FIRST** |
| `auto_save_memory` | ~100 tokens | Saving new content |
| `get_memory` | ~1500+ tokens | Only for specific memory |
| `list_memories` | ~10k+ tokens | ❌ NEVER |

### Example Workflow

```
# User: "Help me write a PRD for user authentication"

# 1. Search existing PRDs (compact - ~70 tokens)
search_memories(query="PRD authentication user", mode="compact", limit=5)

# 2. If found relevant patterns, use them
# If not, create new context:
create_context(name="Authentication PRD")

# 3. Save PRD with duplicate detection
auto_save_memory(content="# PRD: Authentication...", checkDuplicates=true)

# Result: Only ~200 tokens used vs 5000+ tokens before!
```

### Why This Matters

Product work involves lots of documentation (PRDs, specs, roadmaps).
- Without optimization: 1 PRD = ~5000 tokens (19% of context)
- With optimization: 1 PRD = ~200 tokens (0.8% of context)

**Savings: 95% reduction in token usage!**
