# Story S-04: Context Injection

**Epic**: E-01 Auto-capture
**Status**: Ready
**Priority**: P1
**Points**: 3
**Sprint**: 1

---

## User Story

**As a** développeur
**I want** que Nexus injecte automatiquement le contexte pertinent au démarrage
**So that** Claude connaît l'historique du projet sans que je le demande

---

## Acceptance Criteria

### AC-01: Injection on Session Start
```gherkin
Given une nouvelle session Claude démarre
When le hook sessionStart est exécuté
Then:
  - Les mémoires pertinentes sont récupérées (scope: current branch/repo)
  - Les mémoires sont filtrées par pertinence (score > 0.3)
  - Un résumé est généré (< 2000 tokens)
  - Le résumé est affiché ou injecté dans le contexte
```

### AC-02: Progressive Disclosure
```gherkin
Given trop de mémoires sont pertinentes (> 10)
When l'injection est préparée
Then:
  - Step 1: Recall compact (IDs + titres)
  - Step 2: Timeline des 5 plus récentes
  - Step 3: Full content uniquement sur demande
  - Max 2000 tokens injection initiale
```

### AC-03: Relevance Scoring
```gherkin
Given des mémoires existent pour le projet
When l'injection est préparée
Then:
  - Les mémoires sont scorées par pertinence:
    * Même branche: +0.3
    * Récemment créée (< 7 jours): +0.2
    * Même type (decision/bugfix): +0.1
    * Tags chevauchement: +0.1
  - Score minimum: 0.3 (pour éviter le bruit)
  - Max 5 mémoires injectées
```

### AC-04: Formatted Output
```gherkin
Given les mémoires sont sélectionnées
When l'injection est générée
Then le format est:
  ## Project Context (Nexus)
  ### Recent Decisions
  - [D-42] Used SQLite for storage (2 days ago)

  ### Known Bugs
  - [B-15] Race condition in watcher (last week)

  Use /nexus for more details.
```

### AC-05: User Control
```gherkin
Given l'utilisateur ne veut pas d'injection
When la variable NEXUS_NO_INJECT=1 est définie
Then:
  - Aucune injection n'est faite
  - Le message "[NEXUS] Context injection disabled" est affiché
```

---

## Technical Specification

### Hook Script Modification

```bash
#!/bin/bash
# sessionStart.sh - add context injection

SESSION_ID=$(uuidgen)
echo "$SESSION_ID" > ~/.nexus/session-id

# Capture session start (existing)
curl -X POST "$NEXUS_API/capture" ... &

# NEW: Fetch and inject context
if [ -z "$NEXUS_NO_INJECT" ]; then
  CONTEXT=$(curl -s "$NEXUS_API/context/inject?session_id=$SESSION_ID")

  if [ -n "$CONTEXT" ] && [ "$CONTEXT" != "null" ]; then
    echo ""
    echo "## 🧠 Nexus Project Context"
    echo "$CONTEXT"
    echo ""
    echo "Use /nexus to search memories and patterns."
    echo ""
  fi
fi
```

### API Endpoint: Context Injection

```typescript
// GET /context/inject
app.get('/context/inject', async (c) => {
  const { session_id } = c.req.query()
  const db = await getDb()

  // Get session info
  const session = await getSessionInfo(session_id)

  // 1. Recall compact (progressive disclosure layer 1)
  const memories = db.query(`
    SELECT id, type, title, tags, created_at, scope
    FROM memories
    WHERE scope = ? OR scope = 'repo'
    ORDER BY created_at DESC
    LIMIT 20
  `, [session.branch])

  // 2. Score by relevance
  const scored = memories.map(m => ({
    ...m,
    score: calculateRelevanceScore(m, session)
  }))

  // 3. Filter and sort
  const relevant = scored
    .filter(m => m.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  // 4. Format output
  const output = formatContext(relevant, session)

  return c.text(output)
})

function calculateRelevanceScore(memory: Memory, session: Session): number {
  let score = 0

  // Same branch
  if (memory.scope === session.branch) score += 0.3

  // Recent (within 7 days)
  const daysSince = (Date.now() / 1000 - memory.created_at) / 86400
  if (daysSince < 7) score += 0.2

  // Type weighting
  if (memory.type === 'decision') score += 0.1
  if (memory.type === 'bugfix' && daysSince < 30) score += 0.15

  // Tag overlap
  const sessionTags = getSessionTags(session)
  const memoryTags = new Set(JSON.parse(memory.tags))
  const overlap = sessionTags.filter(t => memoryTags.has(t)).length
  score += overlap * 0.05

  return Math.min(score, 1.0)
}

function formatContext(memories: Memory[], session: Session): string {
  const byType = groupBy(memories, 'type')

  let output = `\n### 📍 Branch: ${session.branch}\n\n`

  if (byType.decision?.length > 0) {
    output += `#### Recent Decisions\n`
    for (const m of byType.decision.slice(0, 3)) {
      const daysAgo = Math.floor((Date.now() / 1000 - m.created_at) / 86400)
      output += `- [${m.id}] ${m.title} (${daysAgo}d ago)\n`
    }
    output += `\n`
  }

  if (byType.bugfix?.length > 0) {
    output += `#### Known Issues\n`
    for (const m of byType.bugfix.slice(0, 2)) {
      output += `- [${m.id}] ${m.title}\n`
    }
    output += `\n`
  }

  if (byType.discovery?.length > 0) {
    output += `#### Recent Discoveries\n`
    for (const m of byType.discovery.slice(0, 2)) {
      output += `- [${m.id}] ${m.title}\n`
    }
    output += `\n`
  }

  output += `\n*Use /nexus recall to explore full context*\n`

  return output
}
```

---

## Output Examples

### Example 1: Rich Context

```
## 🧠 Nexus Project Context

### 📍 Branch: feature/auth-oauth

#### Recent Decisions
- [D-42] Used Passport.js for OAuth (2 days ago)
- [D-38] Chose JWT over sessions for API auth (1 week ago)

#### Known Issues
- [B-15] Token refresh sometimes fails on Safari (5 days ago)
- [B-12] CORS preflight caching issue (2 weeks ago)

#### Recent Discoveries
- [D-35] Next.js 15 has built-in OAuth helpers (3 days ago)

*Use /nexus recall to explore full context*
```

### Example 2: Minimal Context

```
## 🧠 Nexus Project Context

*No relevant memories found for this branch.
Use /nexus to capture project context.*
```

---

## Definition of Done

- [ ] Hook modifié avec appel /context/inject
- [ ] API endpoint implémenté
- [ ] Scoring fonctionnel
- [ ] Progressive disclosure OK
- [ ] Format output validé
- [ ] Token count < 2000
- [ ] User control (NEXUS_NO_INJECT)
- [ ] Tests OK

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Story S-01 (session info) | Internal | Blocked |
| Mémoires existent | Data | OK |

---

## Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Injection Rate | > 80% | % de sessions avec contexte |
| Avg Token Count | < 1500 | Median |
| User Satisfaction | > 70% | Thumbs up/down |
| Context Recall | > 40% | % de sessions où utile |

---

## Notes

- Injection doit être rapide (< 2s)
- Format markdown pour lisibilité
- IDs cliquables dans terminaux supportant les links
- Feedback loop pour améliorer le scoring
