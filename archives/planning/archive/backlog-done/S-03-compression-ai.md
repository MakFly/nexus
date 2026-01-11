# Story S-03: Compression AI (Distillation)

**Epic**: E-01 Auto-capture
**Status**: Ready
**Priority**: P0
**Points**: 5
**Sprint**: 1

---

## User Story

**As a** système Nexus
**I want** compresser les observations brutes en mémoires concises
**So that** j'économise des tokens et le contexte reste pertinent

---

## Acceptance Criteria

### AC-01: Trigger on Session End
```gherkin
Given N observations brutes sont accumulées pour une session
When le hook sessionEnd est déclenché
Then:
  - Toutes les observations de la session sont récupérées
  - Un job de distillation est créé
  - Le session_id est passé au job
```

### AC-02: LLM Compression
```gherkin
Given les observations brutes sont prêtes
When le job de distillation s'exécute
Then:
  - Les observations sont envoyées à Mistral API
  - Un prompt structuré demande la distillation
  - Le modèle retourne 1-3 mémoires avec:
    * type: "decision" | "bugfix" | "discovery" | "change"
    * title: titre court (< 50 chars)
    * narrative: résumé concis (< 500 chars)
    * tags: liste de tags pertinents
    * confidence: score 0-1
  - Le ratio compression est ≥ 10:1 (brut → distillé)
```

### AC-03: Candidate Creation
```gherkin
Given les mémoires sont générées par l'LLM
When la distillation est terminée
Then:
  - Chaque mémoire est stockée comme "candidate"
  - Les observations sources sont liées
  - Le status est "pending" (en attente de review)
  - Un webhook/notification est envoyé (optionnel)
```

### AC-04: Fallback sans LLM
```gherkin
Given Mistral API n'est pas disponible
When le job de distillation s'exécute
Then:
  - Les observations brutes sont stockées comme "raw" candidates
  - Le kind est "raw" (non distillé)
  - Un message d'avertissement est logué
  - L'utilisateur peut faire la distillation manuellement plus tard
```

### AC-05: Retry Logic
```gherkin
Given l'API LLM retourne une erreur temporaire (429, 503)
When le job de distillation s'exécute
Then:
  - Le job est retenté jusqu'à 3 fois
  - exponential backoff: 1s, 2s, 4s
  - Si échec total → fallback "raw"
```

---

## Technical Specification

### Prompt Template

```typescript
const DISTILL_PROMPT = `You are a technical distillation engine. Given raw observations from a coding session, extract 1-3 concise memories.

Rules:
1. Output ONLY valid JSON array
2. Each memory must have: type, title, narrative, tags, confidence
3. Types: decision, bugfix, discovery, change, preference
4. Title: < 50 characters, descriptive
5. Narrative: < 500 characters, factual, remove fluff
6. Tags: 3-5 relevant technical tags
7. Confidence: 0.0-1.0 based on clarity
8. Skip trivial operations (file reads, status checks)

Input observations:
{observations}

Output format:
[
  {
    "type": "decision",
    "title": "Used SQLite for persistent storage",
    "narrative": "Chose SQLite over PostgreSQL for local development. Rationale: zero config, embedded, sufficient for single-server use case.",
    "tags": ["database", "sqlite", "storage"],
    "confidence": 0.9
  }
]`
```

### Distillation Service

```typescript
// apps/api/src/services/distillation.ts

interface DistillationConfig {
  llmProvider: 'mistral' | 'openai' | 'ollama'
  model: string
  maxRetries: number
  timeoutMs: number
}

class DistillationService {
  async distillSession(sessionId: string): Promise<Candidate[]> {
    const db = await getDb()

    // 1. Fetch observations
    const observations = db.query(`
      SELECT * FROM observations
      WHERE session_id = ? AND processed = FALSE
      ORDER BY timestamp ASC
    `, [sessionId])

    if (observations.length === 0) {
      return []
    }

    // 2. Check if LLM available
    if (!process.env.MISTRAL_API_KEY) {
      return this.createRawCandidates(observations)
    }

    // 3. Call LLM with retry
    let result: Candidate[]
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await this.callLLM(observations)
        break
      } catch (e) {
        if (attempt === 2) {
          console.error('[Distillation] Failed after 3 attempts', e)
          return this.createRawCandidates(observations)
        }
        await sleep(Math.pow(2, attempt) * 1000)
      }
    }

    // 4. Store candidates
    for (const memory of result) {
      db.insert('candidates', {
        session_id: sessionId,
        kind: 'distilled',
        sources: JSON.stringify(observations.map(o => o.id)),
        status: 'pending',
        tags: JSON.stringify(memory.tags),
        metadata: JSON.stringify(memory),
        created_at: Math.floor(Date.now() / 1000)
      })
    }

    // 5. Mark observations as processed
    db.run(`UPDATE observations SET processed = TRUE WHERE session_id = ?`, [sessionId])

    return result
  }

  private async callLLM(observations: Observation[]): Promise<Candidate[]> {
    const prompt = DISTILL_PROMPT.replace(
      '{observations}',
      JSON.stringify(observations, null, 2)
    )

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-medium',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (!response.ok) {
      throw new Error(`LLM error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // Parse JSON response
    return JSON.parse(content)
  }

  private createRawCandidates(observations: Observation[]): Candidate[] {
    // Fallback: store raw observations as-is
    return [{
      type: 'raw',
      title: `Raw session data (${observations.length} observations)`,
      narrative: `Session with ${observations.length} tool usages. Manual review required.`,
      tags: ['raw', 'unprocessed'],
      confidence: 0.5
    }]
  }

  calculateCompressionRatio(raw: Observation[], distilled: Candidate[]): number {
    const rawSize = JSON.stringify(raw).length
    const distilledSize = JSON.stringify(distilled).length
    return rawSize / distilledSize
  }
}
```

### API Endpoint

```typescript
// POST /distill
app.post('/distill', async (c) => {
  const { session_id } = await c.req.json()
  const service = new DistillationService()

  const candidates = await service.distillSession(session_id)

  return c.json({
    session_id,
    candidates_count: candidates.length,
    compression_ratio: service.calculateCompressionRatio(observations, candidates)
  })
})
```

---

## Prompt Examples

### Input
```json
[
  {"tool": "Read", "path": "src/database.ts", "result": "..."},
  {"tool": "Edit", "path": "src/database.ts", "changes": "Added connection pooling"},
  {"tool": "Bash", "command": "npm test", "result": "Tests pass"}
]
```

### Output
```json
[
  {
    "type": "change",
    "title": "Added connection pooling to database",
    "narrative": "Implemented connection pooling in src/database.ts using generic-pool. Reduces connection overhead by reusing connections. All tests passing.",
    "tags": ["database", "performance", "pooling"],
    "confidence": 0.95
  }
]
```

---

## Definition of Done

- [ ] Service distillation implémenté
- [ ] API endpoint /distill fonctionnel
- [ ] Prompt testé et validé
- [ ] Retry logic OK
- [ ] Fallback "raw" testé
- [ ] Compression ratio ≥ 10:1
- [ ] Candidates stockés en DB
- [ ] Tests unitaires OK
- [ ] Documentation complète

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Story S-01, S-02 (observations) | Internal | Blocked |
| MISTRAL_API_KEY | Config | Required |
| Mistral API | External | OK |

---

## Metrics à Suivre

| Metric | Target | Measurement |
|--------|--------|-------------|
| Compression Ratio | ≥ 10:1 | Avg sur 100 sessions |
| LLM Success Rate | ≥ 95% | % de distillations réussies |
| Avg Candidates/Session | 1-3 | Median |
| Processing Time | < 15s | P95 |

---

## Notes

- Temperature basse (0.3) pour outputs consistants
- Timeout 10s pour éviter les blocages
- Candidates doivent être reviewés avant promotion en mémoires
