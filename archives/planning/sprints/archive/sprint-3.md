# Sprint 3 — Learning Core ✅ DONE

**Objectif** : Capture + Distill + PatternCards

**Durée estimée** : 1 semaine

**Packages** : `@nexus/core`, `@nexus/parsers`, `apps/web`

**Dépendances** : Sprint 2 (memory système)

**Status** : ✅ **COMPLET** (2026-01-11)

---

## User Stories

### S3.1 — Candidates Capture ✅

**As a** user
**I want** capturer des exemples de code
**So that** je peux les transformer en patterns

**Acceptance Criteria:**
- [x] Table `candidates` fonctionnelle
- [x] Capture depuis: diff, chunks sélectionnés, dossier
- [x] Status: pending, distilled, archived
- [x] API `POST /patterns/capture`

**Tâches:**
- [x] Créer table `candidates` dans storage (`001_unified_schema.sql:190-198`)
- [x] Implémenter `learning.capture({ kind, sources, tags?, label? })` (`patterns.ts:153-179`)
- [x] Route API capture
- [x] Tests

---

### S3.2 — Pattern Distillation ✅

**As a** user
**I want** distiller un candidat en pattern
**So that** j'ai un template réutilisable

**Acceptance Criteria:**
- [x] Extraction de variables via regex/heuristiques
- [x] Format PatternCard: intent, title, constraints, variables, templates, checklist, gotchas, sources
- [x] Variables typées avec transforms
- [x] API `POST /patterns/distill`

**Tâches:**
- [x] Heuristiques regex (`patterns.ts:91-127`) - 6 types: Class, Function, Routes, Resources, Tables, Components
- [x] Implémenter `learning.distill({ candidateId, intent, constraints?, variablesHint? })` (`patterns.ts:246-359`)
- [x] Extraction variables: classe, namespace, route, resource
- [x] Création PatternCard draft
- [x] Route API distill

---

### S3.3 — Patterns CRUD ✅

**As a** user
**I want** créer/éditer des patterns
**So that** je peux affiner mes templates

**Acceptance Criteria:**
- [x] Table `patterns` avec tous les champs
- [x] API endpoints `/patterns` (GET, POST, PATCH, DELETE)
- [x] Validation du format PatternCard
- [x] Fonction `learning.upsertPattern()`

**Tâches:**
- [x] CRUD patterns dans storage (`001_unified_schema.sql:139-155`)
- [x] Implémenter upsertPattern dans core
- [x] Routes API CRUD patterns (`patterns.ts:454-625`)
- [x] Tests validation

---

### S3.4 — Pattern Recall (Progressive Disclosure) ✅

**As a** user
**I want** rappeler des patterns en 2 étapes
**So that** je minimise les tokens (templates = gros payloads)

> 🎯 **Même pattern que Memory** : PatternCards compactes → Templates on-demand

**Acceptance Criteria:**
- [x] **Étape 1** : `learning.recall()` retourne PatternCards compactes (id, intent, title, constraints, score)
- [x] **Étape 2** : `learning.getTemplates({ patternId })` retourne templates + variables
- [x] Max 3 PatternCards retournées
- [x] Ranking par success_rate
- [x] PatternCard ~100 tokens, templates ~2000+ tokens

**Tâches:**
- [x] Implémenter `learning.recall()` → PatternCards sans templates (`patterns.ts:363-426`)
- [x] Implémenter `learning.getTemplates()` → templates on-demand (`patterns.ts:429-449`)
- [x] FTS sur intent + tags
- [x] Filtres constraints (lang, framework, version)
- [x] Route API `GET /patterns/recall` (compact)
- [x] Route API `GET /patterns/:id/templates` (full)

---

### S3.5 — UI Learning Page (Liste + Editor) ✅

**As a** user
**I want** gérer mes patterns visuellement
**So that** je peux les créer et éditer

**Acceptance Criteria:**
- [x] Page `/learning` avec onglets: Patterns, Candidates
- [x] Liste patterns avec intent/tags/success_rate
- [ ] Pattern editor: variables, constraints, templates, gotchas (basique)
- [ ] Candidates list avec action "Distill" (basique)
- [ ] Wizard de distillation (non implémenté)

**Tâches:**
- [x] Créer routes `/learning`
- [x] Composant `PatternCard`
- [ ] Composant `PatternEditor` (partiel)
- [ ] Wizard `DistillWizard` (non implémenté)
- [x] Hooks API

---

## Livrables

- [x] Capture → Distill workflow
- [x] CRUD patterns complet
- [x] Recall patterns (max 3 cards)
- [x] UI Learning basique

---

## Format PatternCard

```typescript
interface PatternCard {
  id: string;
  intent: string;           // "Create a new API endpoint"
  title: string;            // "REST Endpoint Pattern"
  constraints: {
    lang?: string;          // "typescript"
    framework?: string;     // "express"
    version?: string;       // "^4.0.0"
    pathPattern?: string;   // "src/routes/**"
  };
  variables: Array<{
    name: string;           // "ResourceName"
    type: string;           // "string" | "number" | "boolean"
    transform?: string;     // "pascalCase" | "camelCase" | "kebabCase"
    default?: string;
  }>;
  // Templates NON inclus dans recall (on-demand via getTemplates)
  templates: Array<{
    path: string;           // "src/routes/{{resourceName}}.ts"
    content: string;
  }>;
  checklist: string[];
  gotchas: string[];
  sources: Array<{
    chunkId?: string;
    fileId?: string;
  }>;
  usageCount: number;
  successRate: number;
}
```

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Extraction variables imprécise | Regex robustes + validation manuelle UI |
| Templates trop gros | Limite 6k chars + split en fichiers |
