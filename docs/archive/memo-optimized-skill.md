---
name: memo
description: Automatic knowledge capture using free-context MCP. Use when learning technical concepts, best practices, API specifics, version changes, or user says "remember", "save", "store", "we saw", "previously". Triggers on: React, Next.js, Laravel, patterns, debugging solutions, optimizations. Automatically checks for pending memory proposals and suggests storing valuable insights.
allowed-tools: Read, mcp__free-context__auto_save_memory, mcp__free-context__add_memory, mcp__free-context__search_memories, mcp__free-context__get_context, mcp__free-context__get_memory
---

# Memo - Automatic Memory Layer

## ⚡ TOKEN EFFICIENCY (CRITICAL)

This skill uses **free-context MCP tools** for knowledge persistence. **ALWAYS** follow these patterns to minimize token usage:

### MCP Tool Usage Rules

| Tool | Token Cost | When to Use |
|------|------------|-------------|
| `search_memories(mode="compact")` | ~70 tokens | **ALWAYS FIRST** - find existing knowledge |
| `auto_save_memory(checkDuplicates=true)` | ~100 tokens | Saving new content (returns metadata only) |
| `add_memory()` | ~100 tokens | Explicit save with custom metadata |
| `get_context()` | ~200 tokens | Get specific context details |
| `get_memory(memoryId)` | ~1500+ tokens | Only when full content is needed |
| `list_contexts()` | ~5k+ tokens | ❌ **NEVER** - use search instead |
| `list_memories()` | ~10k+ tokens | ❌ **NEVER** - use search instead |

### Standard Workflow (99% token savings)

```bash
# 1. Search existing knowledge FIRST (compact mode - ~70 tokens)
search_memories(query="React hooks dependency", mode="compact", limit=5)

# 2. If found relevant memory, get full content ONLY if needed
get_memory(memoryId="specific-id")

# 3. Only create new memory if no relevant results
auto_save_memory(content="React hooks dependency rules...", checkDuplicates=true)

# Result: ~200 tokens instead of 15000+ tokens!
```

### When Retrieving Knowledge

```bash
# ❌ BAD - Uses 15000+ tokens!
list_contexts()  # Returns ALL contexts with full content
list_memories()  # Returns ALL memories with full content

# ✅ GOOD - Uses ~70 tokens!
search_memories(query="Next.js caching", mode="compact", limit=5)
```

### When Saving Knowledge

```bash
# auto_save_memory returns compact response:
# {
#   "memory": { "id": "...", "title": "...", "type": "..." },
#   "duplicate": false
# }
# Full content NOT returned (saves ~1400 tokens per save!)
```

### Why This Matters

Knowledge management is token-heavy:
- ❌ Without optimization: 1 knowledge session = ~15000 tokens (56% of context)
- ✅ With optimization: 1 knowledge session = ~200 tokens (0.8% of context)

**Savings: 99% reduction in token usage!**

## Core Behavior

### 1. ALWAYS check for pending proposals
At the START of every response, read `.claude/memo_proposals.txt` if it exists.
If proposals exist, present them to the user for confirmation.

### 2. After valuable knowledge sharing
If your response contained non-trivial technical knowledge, propose it for storage using free-context MCP.

## What qualifies for storage?

✅ **DO propose** these:
- Best practices, patterns, conventions
- API specifics, parameters, syntax, return types
- Version changes, breaking changes, migrations
- Debug solutions with root causes explained
- Performance optimizations with measurements
- Corrections to previous information
- Framework-specific quirks or gotchas
- Configuration examples with explanations

❌ **DO NOT store**:
- Greetings, acknowledgments, simple confirmations
- Generic advice without specifics
- Ephemeral info (user's current files, temporary state)
- Code without explanation
- Trivial facts (< 20 words)

## Flow

```
1. User asks question
   ↓
2. Check .claude/memo_proposals.txt → Present if exists
   ↓
3. Search existing knowledge (compact mode - ~70 tokens)
   ↓
4. If relevant found → Use existing knowledge
   ↓
5. If not found → Answer the question
   ↓
6. If answer had value → Extract and save memory
   ↓
7. Use mcp__free-context__auto_save_memory (returns ~100 tokens)
```

## Memory Types

| Type | When to use | Example |
|------|-------------|---------|
| `note` | General knowledge | "React hooks dependency array rules" |
| `reference` | API docs, specs | "Next.js 16 cacheLife presets" |
| `snippet` | Code examples | "useTransition hook pattern" |
| `task` | Todo items | "Implement RAG layer in MCP" |
| `idea` | Concepts, designs | "Skill + Hook architecture" |

## Smart Storage

Use `mcp__free-context__auto_save_memory` for automatic storage with:
- **Duplicate detection** (0.8 threshold)
- **Auto-categorization** (type detection)
- **Auto-generated title**
- **Compact response** (returns metadata only, not full content)

Use `mcp__free-context__add_memory` for explicit storage with:
- Custom title (max 500 chars)
- Specific type
- Metadata (tags, source, etc.)
- **Note: Also returns compact response now**

## Contexts

**❌ DON'T use:** `list_contexts()` - returns ALL contexts with full content (~5k+ tokens)

**✅ INSTEAD use:** `search_memories(query="framework topic", mode="compact")` - finds relevant contexts (~70 tokens)

Common contexts:
- **react-tips** → React patterns, hooks, optimizations
- **nextjs** → App Router, Server Components, caching
- **laravel** → Actions, Pest, API Platform
- **symfony** → Doctrine, Twig, API Platform
- **general** → Default context

## Examples

See [examples.md](examples.md) for detailed usage patterns.

## Goal

**Reduce token consumption by storing and retrieving knowledge efficiently.**

Key principle: **Search first (compact), save efficiently (compact response)**.

Each stored memory = future tokens saved when the same topic comes up again.
