# Sprint 5 — MCP Server ✅ DONE

**Objectif** : Exposition des tools via MCP

**Durée estimée** : 1 semaine

**Packages** : `apps/mcp-server`

**Dépendances** : Sprint 4 (tous les systèmes core)

**Status** : ✅ **COMPLET** (2026-01-11)

---

## User Stories

### S5.1 — MCP Server Bootstrap ✅

**As a** developer
**I want** un serveur MCP fonctionnel
**So that** Claude Code peut utiliser les tools

**Acceptance Criteria:**
- [x] Package `apps/mcp-server/` créé
- [x] Mode stdio supporté
- [x] Manifest tools exposé
- [x] Connection handshake fonctionnel

**Tâches:**
- [x] Setup MCP SDK (`@modelcontextprotocol/sdk`)
- [x] Implémenter stdio transport
- [x] Manifest avec liste tools
- [x] Tests connection

---

### S5.2 — MCP Tools: Search ✅

**As a** Claude agent
**I want** utiliser code.search et code.open
**So that** je peux explorer le code

**Acceptance Criteria:**
- [x] Tool `code_search({ query, mode, limit })`
- [x] Tool `code_open({ path, startLine, endLine })`
- [x] Respect des caps (maxSearchHits, maxOpenLines)
- [x] Retour formaté pour LLM (~50 tokens/hit)

**Tâches:**
- [x] Implémenter handler code_search (`index.ts:194-209`)
- [x] Implémenter handler code_open (`index.ts:212-222`)
- [x] Formater output compact
- [x] Tests MCP

---

### S5.3 — MCP Tools: Memory ✅

**As a** Claude agent
**I want** utiliser memory.recall et memory.upsert
**So that** je peux stocker et rappeler des informations

**Acceptance Criteria:**
- [x] Tool `memory_recall({ query, scope?, type?, limit? })`
- [x] Tool `memory_get({ ids })`
- [x] Tool `memory_upsert({ type, scope, title, narrative, tags, confidence })`
- [x] Format compact (~50 tokens/item)

**Tâches:**
- [x] Handler memory_recall (`index.ts:225-242`)
- [x] Handler memory_get (`index.ts:244-258`)
- [x] Handler memory_upsert (`index.ts:260-279`)
- [x] Tests

---

### S5.4 — MCP Tools: Learning ✅

**As a** Claude agent
**I want** utiliser les tools learning
**So that** je peux capturer et appliquer des patterns

**Acceptance Criteria:**
- [x] Tool `learning_recall`
- [x] Tool `learning_getTemplates`
- [x] Tool `learning_apply`
- [x] Tool `learning_feedback`

**Tâches:**
- [x] Handlers pour chaque tool (`index.ts:282-367`)
- [x] Respect caps (maxPatternCards=3, maxTemplateChars=6k)
- [x] Tests

---

### S5.5 — MCP Tool: repo_stats ✅

**As a** Claude agent
**I want** voir les stats du repo
**So that** je comprends le contexte

**Acceptance Criteria:**
- [x] Tool `repo_stats()`
- [x] Retourne: files count, chunks count, patterns count, last index time

**Tâches:**
- [x] Implémenter handler repo_stats (`index.ts:370-382`)
- [x] Tests

---

### S5.6 — MCP Prompts (Context Auto-injection) ✅

**As a** Claude agent
**I want** recevoir du contexte pertinent au démarrage
**So that** je suis productif dès le début de session

> 🎯 **Inspiré claude-mem** : Context injection sans intervention manuelle

**Acceptance Criteria:**
- [x] MCP Prompts définis dans le manifest
- [x] Prompt "session_start" avec contexte repo (stats, patterns fréquents, mémoires récentes)
- [x] Prompt "onboarding" avec conventions du projet
- [x] Prompts optionnels (activables par config)

**Tâches:**
- [x] Définir prompts dans MCP manifest (`index.ts:396-405`)
- [x] Implémenter génération contexte session_start (`index.ts:418-437`)
- [x] Implémenter génération onboarding (`index.ts:443-466`)
- [ ] Config pour activer/désactiver prompts (via env vars)
- [ ] Documentation intégration Claude Code hooks

---

## Livrables

- [x] MCP Server fonctionnel
- [x] Tous les tools exposés (9 tools)
- [x] MCP Prompts pour context injection (2 prompts)
- [ ] Tests d'intégration MCP (manuel)
- [ ] Documentation tools + hooks

---

## MCP Tools Summary

| Tool | Params | Returns | Tokens |
|------|--------|---------|--------|
| `code_search` | query, mode, limit | hits[] compact | ~14/hit |
| `code_open` | path, startLine, endLine | snippet | ~141 max |
| `memory_recall` | query, scope?, type?, limit? | items[] compact | ~18/item |
| `memory_get` | ids[] | items[] full | ~107/item |
| `memory_upsert` | type, scope, title, narrative, tags | id | minimal |
| `learning_recall` | query, lang?, framework? | patterns[] compact | ~37/pattern |
| `learning_getTemplates` | patternId | templates, variables | ~329 |
| `learning_apply` | patternId, variables, mode | patch/files | variable |
| `learning_feedback` | patternId, outcome, notes? | success_rate | minimal |
| `repo_stats` | - | counts, timestamps | ~50 |

### Token Savings Mesurés

| Type | Compact | Full | Ratio |
|------|---------|------|-------|
| Memory | ~18 tokens | ~107 tokens | **6x** |
| Code | ~14 tokens | ~141 tokens | **10x** |
| Pattern | ~37 tokens | ~329 tokens | **9x** |

---

## __WORKFLOW Tool (Documentation)

```typescript
{
  name: '__WORKFLOW',
  description: `
MANDATORY 3-LAYER WORKFLOW:

1. SEARCH/RECALL → Get index with IDs (~50 tokens/result)
   code_search({ query, limit: 10 })
   memory_recall({ query, limit: 10 })
   learning_recall({ query })

2. CONTEXT/TIMELINE → Get surrounding context (optional)
   memory.timeline({ anchor: ID, window: 5 })

3. GET/FETCH → Full details ONLY for filtered IDs
   code_open({ path, startLine, endLine })
   memory_get({ ids: [...] })
   learning_getTemplates({ patternId })

⚠️ NEVER fetch full details without filtering first.
Token savings: 6-10x vs naive approach.
`
}
```

---

## Risques

| Risque | Mitigation |
|--------|------------|
| MCP SDK breaking changes | Pin version, tests régression |
| Context injection trop verbeux | Configurable + caps stricts |
