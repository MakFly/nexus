# Skills Optimization Plan - Free-Context Token Efficiency

## 🎯 Objective

Reduce token consumption by adding **⚡ TOKEN EFFICIENCY** sections to all skills that use or trigger free-context MCP tools.

## 📊 Prioritization Matrix

| Priority | Skill | Current Issue | Impact | Action Required |
|----------|-------|---------------|--------|-----------------|
| 🔴 **CRITICAL** | **memo** | Uses `list_contexts` + `list_memories` = **20k+ tokens/call** | Save 99% (~14800 tokens) | **URGENT** - Already optimized version created |
| 🟠 **HIGH** | laravel | Will store many patterns via memo | Prevent future waste | Add optimization section |
| 🟠 **HIGH** | symfony | Will store many patterns via memo | Prevent future waste | Add optimization section |
| 🟠 **HIGH** | nextjs | Will store many patterns via memo | Prevent future waste | Add optimization section |
| 🟠 **HIGH** | nuxtjs | Will store many patterns via memo | Prevent future waste | Add optimization section |
| 🟡 **MEDIUM** | frontend-design | May store UI patterns | Nice to have | Add optimization section |
| 🟡 **MEDIUM** | terminal-ui | Niche usage | Optional | Add optimization section |
| 🟢 **LOW** | seo | Conceptual, less storage | Optional | Skip |
| ✅ **DONE** | po | Already optimized | - | Ready to install |

## 🔥 Critical: memo Skill

### Current Problem

**Line 4** of `/home/kev/.claude/skills/memo/SKILL.md`:
```yaml
allowed-tools: Read, mcp__free-context__auto_save_memory, ..., mcp__free-context__list_contexts, mcp__free-context__list_memories
                                                                                  ❌ 5k+ tokens          ❌ 10k+ tokens
```

**Line 75**:
```markdown
List available contexts with `mcp__free-context__list_contexts`.  # ❌ 5k+ tokens!
```

### Solution

**Optimized version created:** `/home/kev/Documents/lab/brainstorming/free-context/memo-optimized-skill.md`

Key changes:
1. Remove `list_contexts` and `list_memories` from allowed-tools
2. Add `search_memories` and `get_memory` instead
3. Add comprehensive **⚡ TOKEN EFFICIENCY** section at top
4. Update all examples to use compact search mode

**Expected savings:** ~14,800 tokens per session (99% reduction)

## 📋 Template for Other Skills

Add this section to each framework skill (laravel, symfony, nextjs, nuxtjs):

```markdown
## ⚡ TOKEN EFFICIENCY

When this skill needs to store/retrieve framework knowledge via free-context MCP:

### ALWAYS use compact search first
```bash
search_memories(query="framework-specific topic", mode="compact", limit=5)
```

### When saving patterns
```bash
auto_save_memory(content="# Framework pattern...", checkDuplicates=true)
# Returns metadata only (~100 tokens) not full content
```

### NEVER use these
- ❌ list_memories() - 10k+ tokens
- ❌ list_contexts() - 5k+ tokens
```

## 🚀 Implementation Steps

### Step 1: Install optimized memo skill (URGENT)
```bash
# Backup original
cp ~/.claude/skills/memo/SKILL.md ~/.claude/skills/memo/SKILL.md.backup

# Install optimized version
cp /home/kev/Documents/lab/brainstorming/free-context/memo-optimized-skill.md ~/.claude/skills/memo/SKILL.md
```

### Step 2: Update framework skills
Add optimization sections to:
- laravel
- symfony
- nextjs
- nuxtjs

### Step 3: Update po skill
Install the already-created optimized version.

## 📈 Expected Impact

| Skill | Calls/Session | Before | After | Savings |
|-------|---------------|--------|-------|---------|
| memo | 5-10 | 75,000 tokens | 750 tokens | **99%** |
| po | 3-5 | 15,000 tokens | 600 tokens | **96%** |
| Framework skills | 2-3 | 6,000 tokens | 400 tokens | **93%** |

**Total potential savings: ~90,000 tokens per session (33% of total context!)**

## ✅ Ready to Install

1. ✅ **po** - Optimized version created: `po-optimized-skill.md`
2. ✅ **memo** - Optimized version created: `memo-optimized-skill.md`
3. 🔄 **Framework skills** - Template ready, need to add to each

## 🎯 Next Steps

**Option A**: Install all optimizations now (recommended)
```bash
# I can do this for you - just confirm!
```

**Option B**: Install memo + po first (urgent), framework skills later
```bash
# Install critical ones now, others can wait
```

**Option C**: Review first, then decide
```bash
# Review the optimized versions before installing
```

Which option do you prefer?
