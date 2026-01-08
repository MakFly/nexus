# Best Practices & Optimization Guide

## Token Usage Comparison

| Tool | Tokens per result | When to use |
|------|------------------|-------------|
| `search_memories` (compact) | ~70 tokens | **FIRST** - always use this |
| `search_memories` (standard) | ~120 tokens | When you need more context |
| `search_memories` (detailed) | ~250 tokens | When you need full excerpts |
| `get_memory` | ~1500+ tokens | Only for specific memory |
| `list_memories` | ~1500+ tokens | ❌ AVOID - deprecated |

## Core Principles

### 1. ALWAYS use `search_memories` first (compact mode)

```bash
search_memories(query="...", mode="compact", limit=10)
```

### 2. Only use `get_memory` for selected results

```bash
# Step 1: Search (compact)
search_memories(query="Symfony API", mode="compact")

# Step 2: Get full content only if needed
get_memory(memoryId="specific-id")
```

### 3. Use `auto_save_memory` with checkDuplicates

```bash
auto_save_memory(content="...", checkDuplicates=true)
```

This returns existing memory if duplicate found (saves tokens!).

### 4. NEVER use `list_memories`

It's deprecated and returns full content for ALL memories.

## Recommended Workflow

```bash
# 1. Search existing knowledge first
search_memories(query="Symfony API Platform", mode="compact", limit=5)

# 2. Create new context only if needed
create_context(name="...")

# 3. Save with duplicate detection
auto_save_memory(content="...", checkDuplicates=true, duplicateThreshold=0.8)

# 4. For retrieval, always use compact search first
search_memories(query="specific topic", mode="compact", limit=5)

# 5. Get full content ONLY when needed
get_memory(memoryId="selected-id")
```

## Token Saving Examples

### Before: What "po" skill did (18% context)

```
create_context()          → ~200 tokens
auto_save_memory(full)    → ~1500 tokens × 3 = 4500 tokens
─────────────────────────────────────────────
TOTAL: ~4700 tokens (18%)
```

### After: Optimized approach (~2% context)

```
create_context()          → ~200 tokens
auto_save_memory(full)    → ~1500 tokens (first time)
# Subsequent saves use search_memories
search_memories(compact)  → ~70 tokens × 10 = 700 tokens
─────────────────────────────────────────────
TOTAL: ~2400 tokens (9%)
```

## Search Mode Comparison

| Mode | Excerpt length | Use case |
|------|---------------|----------|
| `compact` | ~60 tokens | **Default** - find relevant memories |
| `standard` | ~120 tokens | Need more context |
| `detailed` | ~250 tokens | Need full excerpts |

## Token Savings Example

**Scenario**: 19 memories, searching for "React hooks"

| Method | Tokens | Savings |
|--------|--------|---------|
| `list_memories` | ~10,000 | - |
| `search_memories` (compact) | ~1,300 | 87% |
| `search_memories` (standard) | ~2,300 | 77% |
| `search_memories` (detailed) | ~4,700 | 53% |
