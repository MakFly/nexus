# Nexus

> **Memory-Powered Development with Token-Efficient MCP Tools**

Nexus est un système de gestion de connaissances pour développeurs qui combine recherche de code, mémoires contextuelles, et patterns réutilisables. Conçu pour intégration avec Claude Code via MCP.

---

## 🎯 Pourquoi Nexus ?

Le développement moderne avec LLM souffre de trois problèmes :

1. **Gasillage de tokens** - Claude Code charge tout le codebase à chaque session
2. **Perte de contexte** - Les décisions et apprentissages précédents sont oubliés
3. **Répétition** - Les mêmes patterns de code sont réécrits maintes et maintes fois

**Nexus résout ces problèmes avec :**

- **Progressive Disclosure** : 3-couches pour économiser 10-20x de tokens
- **Memory System** : Stocke les décisions, préférences, et découvertes
- **Learning System** : Capture et réapplique les patterns de code

---

## 🚀 Quick Start

### Prérequis

- Node.js >= 22.0.0
- Bun >= 1.0.0
- SQLite (supporté nativement)

### Installation

```bash
# Cloner le repository
git clone https://github.com/votre-org/nexus.git
cd nexus

# Installer les dépendances
bun install

# Builder les packages
bun run build
```

### Démarrage

```bash
# Démarrer l'API server (sur http://localhost:3001)
cd apps/api && bun run index.ts

# Démarrer l'UI Web (sur http://localhost:5173)
cd apps/web && bun run dev
```

---

## 📖 Utiliser Nexus avec Claude Code

### Configuration MCP

Ajoutez à votre `~/.claude.json` :

```json
{
  "mcpServers": {
    "nexus": {
      "command": "bun",
      "args": ["run", "/path/to/nexus/apps/mcp-server/src/index.ts"],
      "env": {
        "NEXUS_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

### Tools MCP Disponibles

| Tool | Description | Tokens |
|------|-------------|--------|
| `code_search` | Recherche dans le code indexé | ~50/hit |
| `code_open` | Lit un fichier ou extrait | ~200 max |
| `memory_recall` | Rappelle les mémoires | ~50/item |
| `memory_get` | Contenu complet par IDs | ~500/item |
| `memory_upsert` | Crée/met à jour une mémoire | minimal |
| `learning_recall` | Trouve les patterns applicables | ~100/pattern |
| `learning_getTemplates` | Templates complets d'un pattern | ~2000 |
| `learning_apply` | Applique un pattern (dry-run/write) | variable |
| `learning_feedback` | Enregistre le résultat | minimal |
| `repo_stats` | Statistiques du repository | ~50 |

### Workflow 3-Couches (Progressive Disclosure)

Nexus utilise un système en 3 couches pour minimiser la consommation de tokens :

```
1. RECALL    → Index compact avec IDs        (~50 tokens/item)
2. TIMELINE  → Contexte chronologique        (optionnel)
3. GET/FETCH → Contenu complet (filtré)      (~500+ tokens/item)
```

**Exemple d'utilisation :**

```typescript
// Étape 1: Rappeler les mémoires pertinentes
memory_recall({ query: "auth implementation", limit: 10 })
// → Retourne: [{id: 42, summary: "...", type: "decision"}, ...]

// Étape 2: Voir le contexte autour d'une mémoire
memory_timeline({ anchor: 42, window: 5 })
// → Retourne: {before: [...], after: [...]}

// Étape 3: Récupérer le contenu complet
memory_get({ ids: [42, 45, 47] })
// → Retourne: Contenu narratif complet des 3 mémoires
```

---

## 🧠 Concepts

### Memory System

Les mémoires stockent des informations contextuelles avec :

- **Types** : `decision`, `preference`, `fact`, `note`, `discovery`, `bugfix`, `feature`, `refactor`, `change`
- **Scopes** : `repo`, `branch`, `ticket`, `feature`, `global`
- **Links** : Connexions vers des fichiers/chunks du codebase

### Learning System

Les patterns sont des templates de code réutilisables :

1. **Capture** - Enregistre un exemple de code comme candidat
2. **Distill** - Transforme le candidat en pattern avec variables
3. **Recall** - Trouve les patterns applicables (max 3)
4. **Apply** - Applique le pattern avec des variables (dry-run ou write)
5. **Feedback** - Enregistre le succès/échec pour améliorer le ranking

---

## 📁 Structure du Projet

```
nexus/
├── apps/
│   ├── api/           # REST API (Hono + SQLite)
│   ├── mcp-server/    # MCP Server (stdio transport)
│   └── web/           # UI Web (React + shadcn/ui)
├── packages/
│   ├── storage/       # SQLite database + migrations
│   ├── search/        # FTS5 + semantic search
│   └── core/          # Core logic (memory, learning)
├── planning/          # Sprint planning & specs
└── docs/              # Documentation détaillée
```

---

## 🔧 Configuration

### Variables d'environnement

```bash
# apps/api/.env
PORT=3001

# Pour la recherche sémantique (optionnel)
MISTRAL_API_KEY=votre_clé_ici
EMBEDDING_PROVIDER=mistral  # ou 'openai' | 'ollama'
```

### Indexation du code

> **Note:** Le file indexer est actuellement en standby. Utilisez un outil externe pour indexer votre codebase.

Pour rechercher dans votre code, utilisez `code_search` qui interroge la base FTS5 indexée.

---

## 📚 Documentation

- [Guide MCP Complet](docs/MCP_USAGE.md) - Utilisation détaillée des tools MCP
- [API Reference](docs/API.md) - Endpoints HTTP de l'API
- [Architecture](docs/ARCHITECTURE.md) - Architecture interne
- [Sprint Planning](planning/sprints/_overview.md) - Roadmap du projet

---

## 🤝 Contribution

Nexus est en développement actif. Consultez les [sprints](planning/sprints/) pour voir ce qui est prévu.

---

## 📄 Licence

MIT

---

**Nexus** - *Memory-Powered Development*
