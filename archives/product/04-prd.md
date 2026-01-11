# Nexus Automation - Product Requirements Document

**Version**: 1.0
**Status**: Draft
**Date**: 2025-01-11
**Author**: PO (via skill)

---

## Executive Summary

Nexus est un système de mémoire persistante et de patterns réutilisables pour développeurs. Actuellement, la capture de contexte et l'indexation sont manuels. Ce PRD définit deux features d'automation pour combler ce gap :

1. **Auto-capture** : Lifecycle hooks pour capturer automatiquement les observations
2. **Indexation continue** : File watcher pour maintenir l'index à jour en temps réel

---

## Problem Statement

### Current State

| Feature | Nexus aujourd'hui | claude-mem | mgrep |
|---------|-------------------|------------|-------|
| Capture de contexte | Manuel (POST /memory) | Auto (hooks) | N/A |
| Indexation code | Manuel (indexer-py) | N/A | Auto (watch) |
| Fraîcheur données | Stale | Real-time | Real-time |

### Pain Points

1. **Charge cognitive** : L'utilisateur doit penser à sauvegarder les décisions importantes
2. **Perte d'information** : Sans capture auto, beaucoup de contexte est perdu
3. **Index stale** : Après un refactor, l'index est désynchronisé du code
4. **Friction adoption** : Trop manuel → les développeurs n'utilisent pas

### User Impact

> *"Je viens de passer 2h à déboguer un problème qu'on a déjà résolu la semaine dernière, mais je ne l'ai pas sauvegardé dans Nexus."*

---

## Solution Overview

### Feature 1: Auto-capture (Lifecycle Hooks)

**Concept** : Un système de hooks qui capture automatiquement les événements Claude Code et les stocke dans Nexus.

**Architecture** :
```
Claude Code → Hook Script → Compression AI → Nexus API
     ↓              ↓                ↓              ↓
  Session     Observation      Distillation     Memory
  Start       Post-Tool        (LLM)           Storage
              Session End
```

### Feature 2: Indexation Continue (File Watcher)

**Concept** : Un watcher qui surveille les changements de fichiers et met à jour l'index FTS5 en temps réel.

**Architecture** :
```
Filesystem → Watcher → Debounce → Indexer → SQLite
   ↓           ↓          ↓          ↓         ↓
 .gitignore   chokedar   500ms     chunks   FTS5
```

---

## User Stories & Acceptance Criteria

### Epic E-01: Auto-capture

#### Story S-01: Hook Session Start
**As a** développeur utilisant Claude Code
**I want** que Nexus capture automatiquement le début de session
**So that** je peux tracer l'historique des sessions

**Acceptance Criteria**:
```gherkin
Given Claude Code démarre une nouvelle session
When le hook sessionStart est exécuté
Then une observation est créée dans Nexus:
  - type: "session"
  - scope: "branch" (ou "repo")
  - title: "Session started on {branch}"
  - narrative contient: cwd, git branch, timestamp
```

**Priority**: P0 | **Estimate**: 0.5 day

---

#### Story S-02: Hook Post-Tool
**As a** développeur
**I want** que chaque tool usage soit capturé
**So that** je peux revoir ce qui a été fait

**Acceptance Criteria**:
```gherkin
Given Claude Code exécute un tool (Read, Edit, Bash, etc.)
When le hook postTool est exécuté
Then une observation candidate est créée:
  - tool name, parameters, result
  - filtré: exclure <private>, credentials, tokens
  - taggé avec le type d'opération
```

**Priority**: P0 | **Estimate**: 1 day

---

#### Story S-03: Compression AI
**As a** système Nexus
**I want** compresser les observations brutes
**So that** j'économise des tokens et stockage

**Acceptance Criteria**:
```gherkin
Given N observations brutes sont accumulées
When le hook sessionEnd est déclenché
Then:
  - Les observations sont compressées via LLM
  - Output: 1-3 mémoires distillées (decision, bugfix, discovery)
  - Ratio compression: ~10:1 (brut → distillé)
  - Les candidats sont stockés pour review
```

**Priority**: P0 | **Estimate**: 2 days

---

#### Story S-04: Context Injection
**As a** développeur
**I want** que Nexus injecte le contexte pertinent au démarrage
**So that** Claude connaît l'historique du projet

**Acceptance Criteria**:
```gherkin
Given une nouvelle session Claude démarre
When le hook sessionStart s'exécute
Then:
  - Récupère les mémoires pertinentes (scope: current branch)
  - Applique progressive disclosure: recall → timeline → get
  - Injecte via context ou via tool response
  - Max 2000 tokens de contexte
```

**Priority**: P1 | **Estimate**: 1 day

---

### Epic E-02: Indexation Continue

#### Story S-05: File Watcher
**As a** développeur
**I want** que Nexus surveille mes fichiers automatiquement
**So that** l'index est toujours à jour

**Acceptance Criteria**:
```gherkin
Given le watcher est lancé (nexus watch)
When un fichier est modifié/créé/supprimé
Then:
  - L'événement est capturé (respectant .gitignore)
  - Le fichier est ajouté à la queue d'indexation
  - Debounce de 500ms pour éviter les doublons
```

**Priority**: P0 | **Estimate**: 1 day

---

#### Story S-06: Incremental Index
**As a** système Nexus
**I want** mettre à jour uniquement les fichiers modifiés
**So that** l'indexation est rapide

**Acceptance Criteria**:
```gherkin
Given un fichier a été modifié
When le watcher déclenche l'indexation
Then:
  - Supprime les anciens chunks de ce fichier
  - Crée les nouveaux chunks
  - Met à jour FTS5 sans rebuild complet
  - Affiche la progression (indexed X files, Y chunks)
```

**Priority**: P0 | **Estimate**: 1.5 days

---

#### Story S-07: Pause/Resume
**As a** développeur
**I want** pauser/reprendre le watcher
**So that** je peux contrôler quand l'indexation tourne

**Acceptance Criteria**:
```gherkin
Given le watcher tourne en background
When j'exécute nexus watch --pause
Then:
  - Le watcher suspend la surveillance
  - Les fichiers modifiés sont accumulés
When j'exécute nexus watch --resume
Then:
  - Les fichiers accumulés sont indexés
  - La surveillance reprend
```

**Priority**: P2 | **Estimate**: 0.5 day

---

## Scope & Boundaries

### In Scope (MVP)

| Feature | Minimum Viable |
|---------|----------------|
| Auto-capture | 4 hooks (sessionStart, postTool, sessionEnd, preHook) |
| Compression | LLM-based, 10:1 ratio |
| Injection | Via response text (MVP) |
| Watcher | chokedar-based, .gitignore aware |
| Incremental | Delete + insert per file |

### Out of Scope (v1)

- ❌ Smart filters (auto-détection de contenu important)
- ❌ Relationship auto-detection
- ❌ Cross-session continuity (sessions isolées)
- ❌ Remote indexing (indexation distribué)
- ❌ Advanced scheduling (cron, deferred)

### Future Considerations (v2+)

- 🔄 Endless Mode (compression en continu)
- 🔄 Auto-relationships entre mémoires
- 🔄 Query expansion pour la recherche
- 🔄 Multi-repo support

---

## Assumptions

| Assumption | Impact if False | Validation |
|------------|-----------------|------------|
| Claude Code hooks existent | Feature impossible | Docs Claude Code |
| Bun supporte file watching | Use Node.js watcher | POC chokedar |
| MISTRAL_API_KEY dispo | Fallback sans compression | Test env var |
| SQLite FTS5 supporte incremental | Rebuild complet nécessaire | Test DELETE/INSERT |

---

## Success Metrics

See `product/06-metrics-kpis.md`

---

## Risks

See `product/07-risks.md`

---

## Open Questions

| Question | Impact | Owner |
|----------|--------|-------|
| Format d'injection du contexte ? | High | Tech |
| Comment gérer les sessions concurrently ? | Medium | Tech |
| Fallback si LLM down pour compression ? | Medium | Tech |
| Watcher performance sur gros repo ? | Medium | Tech |

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Claude Code hooks API | External | À vérifier |
| chokedar (Bun compatible) | Library | À tester |
| MISTRAL_API_KEY | Config | Optionnel |
| Schema Nexus (observations) | Internal | À créer |

---

## Timeline Estimate

| Sprint | Duration | Deliverables |
|--------|----------|--------------|
| Sprint 0 | 2 days | Design + POC hooks |
| Sprint 1 | 5 days | Auto-capture MVP |
| Sprint 2 | 4 days | Indexation continue |
| Sprint 3 | 3 days | Integration + testing |

**Total**: ~14 days (3 weeks)

---

## Definition of Done

Une feature est "done" quand :
- [ ] User stories implémentées avec AC validés
- [ ] Tests unitaires + E2E passent
- [ ] Documentation mise à jour
- [ ] Code reviewé et mergé
- [ ] Démo fonctionnelle faite
