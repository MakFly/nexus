# Guide d'Utilisation MCP - Nexus

> Comment utiliser les tools Nexus dans Claude Code pour un développement plus intelligent

---

## 📖 Table des Matières

1. [Configuration](#configuration)
2. [Concepts Clés](#concepts-clés)
3. [Progressive Disclosure](#progressive-disclosure)
4. [Référence des Tools](#référence-des-tools)
5. [Workflows Recommandés](#workflows-recommandés)
6. [Bonnes Pratiques](#bonnes-pratiques)

---

## 🔧 Configuration

### 1. Ajouter le serveur MCP

Dans votre fichier `~/.claude.json` :

```json
{
  "mcpServers": {
    "nexus": {
      "command": "bun",
      "args": ["/chemin/absolu/vers/nexus/apps/mcp-server/src/index.ts"],
      "env": {
        "NEXUS_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

### 2. Démarrer l'API Nexus

```bash
cd /chemin/vers/nexus/apps/api
bun src/index.ts
```

L'API sera accessible sur `http://localhost:3001`

### 3. Redémarrer Claude Code

Les tools Nexus seront maintenant disponibles dans vos sessions Claude Code.

---

## 🧠 Concepts Clés

### Progressive Disclosure (3-Couches)

Nexus utilise un système en **3 couches** pour économiser les tokens :

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: RECALL                          │
│  ~50 tokens/item - Index compact avec IDs et scores        │
│  Tools: code_search, memory_recall, learning_recall        │
├─────────────────────────────────────────────────────────────┤
│                    LAYER 2: TIMELINE                        │
│  ~150 tokens - Contexte chronologique (optionnel)          │
│  Tools: memory_timeline                                     │
├─────────────────────────────────────────────────────────────┤
│                    LAYER 3: GET/FETCH                       │
│  ~500+ tokens/item - Contenu complet (IDs filtrés)         │
│  Tools: code_open, memory_get, learning_getTemplates       │
└─────────────────────────────────────────────────────────────┘
```

### Types de Mémoires

| Type | Usage | Exemple |
|------|-------|---------|
| `decision` | Décisions techniques/architecturales | "Utiliser PostgreSQL pour les données persistantes" |
| `preference` | Préférences personnelles/équipe | "Toujours utiliser TypeScript strict" |
| `fact` | Faits importants | "Le projet utilise Node 22+ minimum" |
| `note` | Notes générales | "Réunion du 15 janvier: priorité au auth" |
| `discovery` | Découvertes/apprentissages | "Découvert: Fastify +15% plus rapide qu'Express" |
| `bugfix` | Solutions à des bugs | "Bug memory leak résolu avec --expose-gc" |
| `feature` | Implémentations de features | "Feature: OAuth2 avec Google provider" |
| `refactor` | Refactorings effectués | "Refactor: extract UserService from auth.ts" |
| `change` | Changements divers | "Migration: ESLint 8 → 9" |

### Scopes de Mémoires

| Scope | Usage |
|-------|-------|
| `repo` | Applicable à tout le repository |
| `branch` | Spécifique à une branche git |
| `ticket` | Lié à un ticket Jira/GitHub issue |
| `feature` | Spécifique à une fonctionnalité |
| `global` | Valable pour tous vos projets |

---

## 📚 Progressive Disclosure

### Pourquoi 3 Couches ?

**❌ Approche naïve (gaspillage de tokens) :**
```typescript
// Charger TOUTES les mémoires avec contenu complet
const allMemories = await getAllMemories() // ~50,000 tokens !
```

**✅ Approche Nexus (économique) :**
```typescript
// Étape 1: Rappel compact (filtrer)
const index = await memory_recall({ query: "auth", limit: 10 })
// → Retourne: [{id: 42, summary: "...", score: 0.95}, ...] (~500 tokens)

// Étape 2: Timeline (contexte)
const context = await memory_timeline({ anchor: 42, window: 5 })
// → Retourne: {before: [...], after: [...]} (~750 tokens)

// Étape 3: Contenu complet (uniquement les sélectionnés)
const full = await memory_get({ ids: [42, 45] })
// → Retourne: Contenu narratif complet (~1000 tokens)

// Total: ~2250 tokens au lieu de ~50,000 (20x d'économie)
```

### Règle d'Or

> **NE JAMAIS** utiliser `memory_get` ou `learning_getTemplates` sans d'abord filtrer avec `recall`.

---

## 🛠️ Référence des Tools

### Code Search

#### `code_search`

Recherche dans le code indexé avec FTS5 ou recherche sémantique.

```typescript
await code_search({
  query: "user authentication",  // Required
  mode: "keyword",               // "keyword" | "semantic" | "hybrid"
  limit: 10                      // Max results (default: 10)
})
```

**Sortie compacte :**
```
./src/auth/user.ts:42-58 [87%] loginUser
./src/auth/oauth.ts:15-32 [76%] OAuthFlow
./src/middleware/auth.ts:8-25 [68%] verifyToken
```

**Tokens:** ~50 par résultat

---

#### `code_open`

Lit un fichier ou extrait des lignes spécifiques.

```typescript
await code_open({
  path: "./src/auth/user.ts",     // Required
  startLine: 42,                  // Optional (1-indexed)
  endLine: 58                     // Optional
})
```

**Sortie :**
```
// src/auth/user.ts
export function loginUser(credentials) {
  // ... full content
}
```

**Tokens:** ~200 max (borné)

---

### Memory

#### `memory_recall`

Rappelle les mémoires avec filtres optionnels.

```typescript
await memory_recall({
  query: "auth implementation",    // Optional search query
  type: "decision",                // Optional: filter by type
  scope: "repo",                   // Optional: filter by scope
  limit: 10                        // Max results (default: 10)
})
```

**Sortie compacte :**
```
[42] decision/repo: Use JWT for auth tokens (95%)
[15] preference/repo: Always validate input (80%)
[89] discovery/repo: Found security issue in passport (75%)
```

**Tokens:** ~50 par item

---

#### `memory_timeline`

Retourne le contexte chronologique autour d'une mémoire.

```typescript
await memory_timeline({
  anchor: 42,      // Memory ID (required)
  window: 5        // Items before/after (default: 5, max: 20)
})
```

**Sortie :**
```
Before: [38] refactored: extract auth logic, [40] decision: use JWT
After:  [45] bugfix: fix token expiration, [47] feature: add refresh
```

**Tokens:** ~150

---

#### `memory_get`

Contenu complet des mémoires par IDs.

```typescript
await memory_get({
  ids: [42, 45, 47]    // Required: Array of memory IDs
})
```

**Sortie :**
```
## [42] JWT Authentication Decision
Type: decision | Scope: repo | Confidence: 95%

We decided to use JWT tokens for authentication because:
- Stateless and scalable
- Built-in expiration mechanism
- Widely supported

Facts: ["Tokens expire after 24h", "Refresh token rotation enabled"]
Tags: ["security", "auth", "jwt"]

---

## [45] Token Expiration Bugfix
Type: bugfix | Scope: repo | Confidence: 100%

Fixed issue where tokens weren't expiring correctly...
```

**Tokens:** ~500 par item

---

#### `memory_upsert`

Crée ou met à jour une mémoire.

```typescript
await memory_upsert({
  type: "decision",           // Required
  scope: "repo",              // Required (default: "repo")
  title: "Use PostgreSQL",    // Required (~20 chars)
  narrative: "Full explanation...",  // Optional
  tags: ["database", "sql"],  // Optional
  confidence: 0.9             // Optional 0-1 (default: 0.8)
})
```

**Sortie :**
```
Memory created with ID: 123
```

**Tokens:** Minimal

---

### Learning

#### `learning_recall`

Trouve les patterns applicables (max 3, triés par succès).

```typescript
await learning_recall({
  query: "Create REST API endpoint",   // Optional search by intent
  lang: "typescript",                  // Optional: filter by language
  framework: "express"                 // Optional: filter by framework
})
```

**Sortie compacte :**
```
[15] REST Endpoint Pattern
Intent: Create REST API endpoint with CRUD operations
Success rate: 85% | Usage: 12
Tags: ["express", "rest", "crud"]

[23] Controller Pattern
Intent: Create MVC controller with validation
Success rate: 78% | Usage: 9
Tags: ["express", "mvc", "validation"]
```

**Tokens:** ~100 par pattern (max 3)

---

#### `learning_getTemplates`

Récupère les templates complets d'un pattern.

```typescript
await learning_getTemplates({
  patternId: 15    // Required: Pattern ID from recall
})
```

**Sortie :**
```
## Variables
- {{ResourceName}} (string, pascalCase)
- {{resourceName}} (string, camelCase)
- {{routePath}} (string, kebabCase)

## Templates
### src/routes/{{resourceName}}.ts
```typescript
import { Router } from 'express';

const router = Router();

router.get('/{{routePath}}', async (req, res) => {
  // Implementation
});

router.post('/{{routePath}}', async (req, res) => {
  // Implementation
});

export default router;
```

### src/controllers/{{ResourceName}}Controller.ts
```typescript
export class {{ResourceName}}Controller {
  // ...
}
```

## Checklist
- [ ] Add input validation
- [ ] Add error handling
- [ ] Add rate limiting

## Gotchas
⚠️ Remember to register routes in app.ts
⚠️ Use async/await for database operations
```

**Tokens:** ~2000

---

#### `learning_apply`

Applique un pattern avec des variables (dry-run ou write).

```typescript
await learning_apply({
  patternId: 15,                    // Required
  variables: {
    ResourceName: "User",
    resourceName: "user",
    routePath: "users"
  },
  mode: "dry-run"                   // "dry-run" | "write" (default: "dry-run")
})
```

**Sortie (dry-run) :**
```
Mode: dry-run

## Preview (dry-run)
### src/routes/user.ts [create]
```typescript
import { Router } from 'express';

const router = Router();

router.get('/users', async (req, res) => {
  // Implementation
});

router.post('/users', async (req, res) => {
  // Implementation
});

export default router;
```

### src/controllers/UserController.ts [create]
```typescript
export class UserController {
  // ...
}
```

## Checklist
- [ ] Add input validation
- [ ] Add error handling
- [ ] Add rate limiting
```

**Sortie (write) :**
```
Mode: write
Applied: true
Files:
- src/routes/user.ts [create]
- src/controllers/UserController.ts [create]
Patch ID: patch-15-1704987654321
```

**Tokens:** Variable (selon la taille des templates)

---

#### `learning_feedback`

Enregistre le résultat pour améliorer le ranking.

```typescript
await learning_feedback({
  patternId: 15,              // Required
  outcome: "success",         // Required: "success" | "fail"
  notes: "Worked perfectly"   // Optional
})
```

**Sortie :**
```
Feedback recorded: success
```

**Tokens:** Minimal

---

#### `repo_stats`

Statistiques du repository.

```typescript
await repo_stats()
```

**Sortie :**
```
# Nexus Stats
Files indexed: 142
Chunks: 1,847
Embeddings: 856
Search engines: fts5, mistral
```

**Tokens:** ~50

---

## 🔄 Workflows Recommandés

### Workflow 1: Explorer un codebase inconnu

```typescript
// 1. Voir les stats du repo
const stats = await repo_stats()

// 2. Chercher une fonctionnalité spécifique
const searchResults = await code_search({
  query: "authentication login",
  mode: "keyword",
  limit: 10
})

// 3. Ouvrir les fichiers pertinents
for (const result of searchResults) {
  const content = await code_open({
    path: result.path,
    startLine: result.startLine,
    endLine: result.endLine
  })
}

// 4. Chercher des décisions précédentes sur l'auth
const memories = await memory_recall({
  query: "auth decision",
  limit: 5
})

// 5. Récupérer le contenu des mémoires pertinentes
const relevantIds = memories.slice(0, 3).map(m => m.id)
const fullMemories = await memory_get({ ids: relevantIds })
```

---

### Workflow 2: Implémenter une nouvelle feature

```typescript
// 1. Vérifier s'il existe des décisions/préférences
const decisions = await memory_recall({
  query: "feature implementation",
  type: "decision"
})

// 2. Chercher des patterns existants
const patterns = await learning_recall({
  query: "Create feature with API endpoint",
  lang: "typescript"
})

// 3. Sélectionner le pattern le plus pertinent
const selectedPattern = patterns[0]

// 4. Récupérer les templates
const templates = await learning_getTemplates({
  patternId: selectedPattern.id
})

// 5. Prévisualiser avec dry-run
const preview = await learning_apply({
  patternId: selectedPattern.id,
  variables: { FeatureName: "UserExport", featureName: "user-export" },
  mode: "dry-run"
})

// 6. Si satisfait, appliquer
const result = await learning_apply({
  patternId: selectedPattern.id,
  variables: { FeatureName: "UserExport", featureName: "user-export" },
  mode: "write"
})

// 7. Enregistrer le feedback
await learning_feedback({
  patternId: selectedPattern.id,
  outcome: "success",
  notes: "Generated clean code, minimal changes needed"
})
```

---

### Workflow 3: Debugging un problème

```typescript
// 1. Chercher le code problématique
const searchResults = await code_search({
  query: "bug error crash",
  mode: "keyword"
})

// 2. Chercher des bugfixes similaires
const bugfixes = await memory_recall({
  query: searchResults[0].query,
  type: "bugfix"
})

// 3. Voir le contexte des bugfixes
for (const fix of bugfixes) {
  const timeline = await memory_timeline({
    anchor: fix.id,
    window: 3
  })
  // Analyser ce qui a été fait avant/après
}

// 4. Récupérer les détails des bugfixes pertinents
const relevantFixes = await memory_get({
  ids: bugfixes.slice(0, 2).map(b => b.id)
})

// 5. Après résolution, enregistrer le bugfix
await memory_upsert({
  type: "bugfix",
  title: "Fix race condition in user service",
  narrative: "The issue was caused by...",
  tags: ["bug", "race-condition", "concurrency"]
})
```

---

### Workflow 4: Onboarding sur un nouveau projet

```typescript
// Utiliser le prompt "session_start" de Nexus

// Claude Code injectera automatiquement au démarrage :
// - Stats du repository
// - Mémoires récentes
// - Patterns les plus utilisés

// Ensuite :
const decisions = await memory_recall({
  type: "decision",
  limit: 10
})

const patterns = await learning_recall({
  limit: 5
})

const preferences = await memory_recall({
  type: "preference",
  limit: 10
})
```

---

## ✅ Bonnes Pratiques

### 1. Toujours filtrer avant de fetcher

❌ **Mauvais :**
```typescript
const allMemories = await memory_get({
  ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...] // Gaspillage !
})
```

✅ **Bon :**
```typescript
const index = await memory_recall({ query: "auth" })
const selected = index.slice(0, 3).map(m => m.id)
const full = await memory_get({ ids: selected })
```

---

### 2. Utiliser le bon type de mémoire

❌ **Mauvais :**
```typescript
await memory_upsert({
  type: "note",  // Trop vague
  title: "Auth stuff",
  narrative: "We use JWT for auth because it's stateless..."
})
```

✅ **Bon :**
```typescript
await memory_upsert({
  type: "decision",  // Précis
  title: "Use JWT for authentication",
  narrative: "Chose JWT over sessions because...",
  tags: ["auth", "jwt", "security"]
})
```

---

### 3. Enregistrer le feedback sur les patterns

❌ **Mauvais :**
```typescript
await learning_apply({ patternId: 15, variables: {...}, mode: "write" })
// Pas de feedback = pas d'amélioration
```

✅ **Bon :**
```typescript
const result = await learning_apply({ patternId: 15, variables: {...}, mode: "write" })

await learning_feedback({
  patternId: 15,
  outcome: result.success ? "success" : "fail",
  notes: result.notes  // Ce qui a marché ou non
})
```

---

### 4. Toujours dry-run avant write

❌ **Risqué :**
```typescript
await learning_apply({
  patternId: 15,
  variables: {...},
  mode: "write"  // Directement écrit les fichiers !
})
```

✅ **Sûr :**
```typescript
// D'abord prévisualiser
const preview = await learning_apply({
  patternId: 15,
  variables: {...},
  mode: "dry-run"
})

// Vérifier le résultat...
// Puis écrire
await learning_apply({
  patternId: 15,
  variables: {...},
  mode: "write"
})
```

---

### 5. Utiliser des tags cohérents

✅ **Bon :**
```typescript
await memory_upsert({
  title: "PostgreSQL for persistent data",
  tags: ["database", "sql", "postgresql", "production"]  // Cohérents
})

// Plus facile à retrouver :
await memory_recall({
  query: "database sql"
})
```

---

## 🎯 Résumé

| Oubliez pas | |
|-------------|---|
| **Progressive Disclosure** | 3 couches pour économiser 10-20x de tokens |
| **Toujours filtrer** | Recall → Timeline → Get |
| **Dry-run d'abord** | Prévisualisez avant d'écrire |
| **Feedback précieux** | Enregistrez le succès/échec des patterns |
| **Types précis** | Decision > Note pour les choix techniques |

---

**Nexus** - *Memory-Powered Development*
