# Sprint 7 — Nexus Turbo (Token Savings 40-50x)

**Objectif** : Passer de 8x à 40-50x token savings
**Durée estimée** : 1 sprint
**Dépendances** : Sprints 0-5 complétés

---

## Vue d'ensemble

| Sous-sprint | Levier | Gain estimé | Priorité |
|-------------|--------|-------------|----------|
| S7.1 | Fusion MCP Tools (9→3) | 3x | P0 |
| S7.2 | Ultra-Compact Format | 5x | P0 |
| S7.3 | Project Scoping | 2x | P1 |
| S7.4 | Lazy Loading 3-tier | 3x | P1 |
| S7.5 | UI /codebase Tree | - | P2 |

**Gain composé théorique** : 3×5×2×3 = **90x**
**Gain réaliste avec overhead** : **40-50x**

---

## S7.1 — Fusion MCP Tools (9→3)

### Objectif
Réduire les descriptions tools de ~3000 tokens à ~1000 tokens.

### Mapping

```
AVANT (9 tools)                    APRÈS (3 tools)
─────────────────                  ─────────────────
code_search
code_open          ──────────────→ nexus_code
(ripgrep via search)               action: search|open

memory_recall
memory_get
memory_upsert      ──────────────→ nexus_memory
(timeline via recall)              action: recall|get|upsert

learning_recall
learning_getTemplates
learning_apply     ──────────────→ nexus_learn
learning_feedback                  action: recall|templates|apply|feedback
```

### Schema des nouveaux tools

```typescript
// nexus_code
{
  action: "search" | "open",
  // search params
  query?: string,
  mode?: "keyword" | "semantic" | "hybrid",
  limit?: number,
  // open params
  path?: string,
  startLine?: number,
  endLine?: number
}

// nexus_memory
{
  action: "recall" | "get" | "upsert",
  // recall params
  query?: string,
  type?: MemoryType,
  scope?: MemoryScope,
  limit?: number,
  // get params
  ids?: number[],
  // upsert params
  title?: string,
  narrative?: string,
  tags?: string[],
  confidence?: number
}

// nexus_learn
{
  action: "recall" | "templates" | "apply" | "feedback",
  // recall params
  query?: string,
  lang?: string,
  framework?: string,
  // templates/apply/feedback params
  patternId?: number,
  variables?: Record<string, string>,
  mode?: "dry-run" | "write",
  outcome?: "success" | "fail",
  notes?: string
}
```

### Fichiers à modifier
- `apps/mcp-server/src/index.ts` — Refactor tools
- `apps/mcp-server/src/handlers/` — Nouveaux handlers par action

---

## S7.2 — Ultra-Compact Format

### Objectif
Réduire les outputs de 50 tokens/item à 10 tokens/item.

### Format actuel vs compact

**Memory recall actuel** (~50 tokens):
```json
{"id": 42, "type": "decision", "scope": "repo", "title": "Use SQLite for storage", "confidence": 0.95, "created_at": "2026-01-10"}
```

**Memory recall compact** (~12 tokens):
```
42|D|R|Use SQLite for storage|95
```

**Légende compacte** (envoyée 1x par session):
```
Format: id|type|scope|title|confidence
Types: D=decision B=bugfix F=feature R=refactor X=discovery C=change P=preference A=fact N=note
Scopes: R=repo B=branch T=ticket F=feature G=global
```

### Code search compact

**Actuel** (~30 tokens):
```json
{"path": "src/index.ts", "startLine": 10, "endLine": 25, "score": 87, "symbol": "handleRequest"}
```

**Compact** (~8 tokens):
```
src/index.ts:10-25|87|handleRequest
```

### Pattern recall compact

**Actuel** (~100 tokens):
```json
{"id": 1, "title": "REST Endpoint", "intent": "Create API endpoint", "lang": "typescript", "framework": "hono", "successRate": 0.92, "usageCount": 15}
```

**Compact** (~15 tokens):
```
1|REST Endpoint|Create API endpoint|ts|hono|92%|15
```

### Implementation
- Ajouter param `?format=compact` (default) vs `?format=json`
- Helper `formatCompact()` dans chaque route
- MCP tools retournent compact par défaut

---

## S7.3 — Project Scoping

### Objectif
Isoler les données par projet pour éviter la pollution cross-projet.

### Migration SQL

```sql
-- 003_projects.sql

-- Table des projets
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_indexed_at TEXT
);

-- Index pour lookup rapide par path
CREATE INDEX IF NOT EXISTS idx_projects_root_path ON projects(root_path);

-- Ajouter project_id aux tables existantes
ALTER TABLE files ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE observations ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE patterns ADD COLUMN project_id INTEGER REFERENCES projects(id);

-- Index pour filtrage par projet
CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project_id);
CREATE INDEX IF NOT EXISTS idx_patterns_project ON patterns(project_id);

-- Patterns globaux (project_id = NULL) restent accessibles partout
```

### Auto-detection projet

```typescript
// Détecte le projet depuis le cwd
async function detectProject(cwd: string): Promise<Project | null> {
  // Cherche un projet dont root_path est parent de cwd
  return db.query(`
    SELECT * FROM projects
    WHERE ? LIKE root_path || '%'
    ORDER BY length(root_path) DESC
    LIMIT 1
  `, [cwd]);
}
```

### API endpoints

- `GET /projects` — Liste des projets
- `POST /projects` — Créer un projet
- `GET /projects/:id` — Détail projet + stats
- `DELETE /projects/:id` — Supprimer (cascade files, pas memories)
- `POST /projects/:id/reindex` — Réindexer le projet

### MCP integration

Le MCP server reçoit le `cwd` et filtre automatiquement par projet.

---

## S7.4 — Lazy Loading 3-tier

### Objectif
Réduire drastiquement les tokens en ne retournant le contenu que sur demande explicite.

### Les 3 tiers

| Tier | Contenu | Tokens/item | Quand |
|------|---------|-------------|-------|
| **T1** | IDs + scores only | ~5 | Par défaut |
| **T2** | + titles/summaries | ~15 | `?tier=2` |
| **T3** | Full content | ~100-500 | `?tier=3` ou `get(ids)` |

### Exemple flow

```
1. recall(query="auth")
   → Tier 1: "42|95 43|87 44|82 45|78"  (20 tokens)

2. Claude analyse les scores, demande plus sur les top 3
   → get(ids=[42,43,44], tier=2)
   → Tier 2: "42|D|R|JWT auth|95\n43|F|R|OAuth flow|87\n44|B|R|Token refresh|82" (45 tokens)

3. Claude a besoin du détail de #42
   → get(ids=[42], tier=3)
   → Tier 3: Full narrative + facts + tags (150 tokens)

TOTAL: 215 tokens vs 2000+ tokens si tout envoyé d'emblée
```

### Implementation

```typescript
// Route memory/recall avec tiers
app.get('/memory/recall', async (c) => {
  const tier = parseInt(c.req.query('tier') || '1');
  const results = await recallMemories(query, { tier });

  if (tier === 1) {
    // IDs + scores only
    return c.text(results.map(r => `${r.id}|${r.score}`).join(' '));
  }
  if (tier === 2) {
    // + type, scope, title
    return c.text(results.map(r =>
      `${r.id}|${TYPE_SHORT[r.type]}|${SCOPE_SHORT[r.scope]}|${r.title}|${r.score}`
    ).join('\n'));
  }
  // tier 3 = full
  return c.json(results);
});
```

---

## S7.5 — UI /codebase avec Tree

### Objectif
Afficher les projets indexés avec leur arborescence.

### Composants shadcn nécessaires

```bash
bunx shadcn@latest add tree-view
# ou utiliser Accordion + custom tree
```

### Structure de la page

```tsx
// routes/codebase.index.tsx

export default function CodebasePage() {
  const { projects, activeProject, setActiveProject } = useNexusStore();

  return (
    <div className="flex h-full">
      {/* Sidebar projets */}
      <aside className="w-64 border-r">
        <h2>Projets Indexés</h2>
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            isActive={project.id === activeProject?.id}
            onClick={() => setActiveProject(project)}
          />
        ))}
        <AddProjectButton />
      </aside>

      {/* Main: Tree du projet actif */}
      <main className="flex-1 p-4">
        {activeProject ? (
          <ProjectTree project={activeProject} />
        ) : (
          <EmptyState message="Sélectionnez un projet" />
        )}
      </main>
    </div>
  );
}
```

### ProjectTree component

```tsx
function ProjectTree({ project }: { project: Project }) {
  const { files } = useProjectFiles(project.id);
  const tree = buildTreeFromFiles(files);

  return (
    <Tree>
      {tree.children.map(node => (
        <TreeNode key={node.path} node={node} />
      ))}
    </Tree>
  );
}

function TreeNode({ node }: { node: FileNode }) {
  if (node.type === 'directory') {
    return (
      <TreeItem>
        <TreeItemTrigger>
          <FolderIcon /> {node.name}
          <Badge variant="outline">{node.fileCount}</Badge>
        </TreeItemTrigger>
        <TreeItemContent>
          {node.children.map(child => (
            <TreeNode key={child.path} node={child} />
          ))}
        </TreeItemContent>
      </TreeItem>
    );
  }

  return (
    <TreeItem>
      <FileIcon /> {node.name}
      <span className="text-muted-foreground text-xs">
        {node.chunkCount} chunks
      </span>
    </TreeItem>
  );
}
```

### Stats par projet

```tsx
function ProjectStats({ project }: { project: Project }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Files" value={project.fileCount} />
      <StatCard label="Chunks" value={project.chunkCount} />
      <StatCard label="Memories" value={project.memoryCount} />
      <StatCard label="Patterns" value={project.patternCount} />
      <StatCard label="Last indexed" value={formatRelative(project.lastIndexedAt)} />
    </div>
  );
}
```

---

## Critères de succès

| Critère | Cible | Mesure |
|---------|-------|--------|
| Token savings | 40-50x | Benchmark avant/après |
| MCP tools | 3 tools | Count |
| Compact format default | Oui | Response size |
| Project isolation | 100% | Cross-project leakage = 0 |
| UI /codebase | Tree fonctionnel | Manual test |

---

## Ordre d'implémentation

1. **S7.1** Fusion tools — Impact immédiat sur descriptions
2. **S7.2** Compact format — Impact immédiat sur réponses
3. **S7.3** Project scoping — Migration DB + API
4. **S7.4** Lazy loading — Refactor recall/get
5. **S7.5** UI codebase — Polish final

---

## Fichiers clés à modifier

### MCP Server
- `apps/mcp-server/src/index.ts` — Tools refacto
- `apps/mcp-server/src/formatters.ts` — NEW: Format compact

### API
- `apps/api/src/routes/memory.ts` — Tiers + compact
- `apps/api/src/routes/patterns.ts` — Tiers + compact
- `apps/api/src/routes/projects.ts` — NEW: CRUD projets

### Storage
- `packages/storage/src/migrations/003_projects.sql` — NEW

### Web
- `apps/web/src/routes/codebase.index.tsx` — Tree view
- `apps/web/src/stores/nexusStore.ts` — Projects state
